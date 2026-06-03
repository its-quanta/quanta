"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { itemIdsSignature } from "@/components/scope/scope-review-utils";
import {
  acceptAiReviewItemAction,
  rejectAiReviewItemAction,
} from "@/src/lib/ai-review/actions";
import type { AiReviewItem } from "@/src/types/database";

function dispatchReviewUpdated(projectId: string) {
  window.dispatchEvent(
    new CustomEvent("quanta:ai-review-updated", {
      detail: { projectId, optimistic: true },
    })
  );
}

export function useOptimisticSuggestions(initialItems: AiReviewItem[]) {
  const [items, setItems] = useState(initialItems);
  const syncedIdsRef = useRef(itemIdsSignature(initialItems));

  useEffect(() => {
    const nextSignature = itemIdsSignature(initialItems);
    if (nextSignature !== syncedIdsRef.current) {
      syncedIdsRef.current = nextSignature;
      setItems(initialItems);
    }
  }, [initialItems]);

  const acceptItem = useCallback(async (id: string, projectId: string) => {
    let previousStatus: AiReviewItem["status"] | undefined;

    setItems((prev) => {
      const previous = prev.find((item) => item.id === id);
      previousStatus = previous?.status;
      return prev.map((item) =>
        item.id === id ? { ...item, status: "accepted" as const } : item
      );
    });

    const result = await acceptAiReviewItemAction(id, projectId);
    if (result.error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && previousStatus
            ? { ...item, status: previousStatus }
            : item
        )
      );
      return { error: result.error };
    }

    if (result.takeoffItemId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "accepted",
                result_takeoff_item_id: result.takeoffItemId ?? null,
              }
            : item
        )
      );
    }

    dispatchReviewUpdated(projectId);
    return { error: null as string | null };
  }, []);

  const rejectItem = useCallback(async (id: string, projectId: string) => {
    let previousStatus: AiReviewItem["status"] | undefined;

    setItems((prev) => {
      const previous = prev.find((item) => item.id === id);
      previousStatus = previous?.status;
      return prev.map((item) =>
        item.id === id ? { ...item, status: "rejected" as const } : item
      );
    });

    const result = await rejectAiReviewItemAction(id, projectId);
    if (result.error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && previousStatus
            ? { ...item, status: previousStatus }
            : item
        )
      );
      return { error: result.error };
    }

    dispatchReviewUpdated(projectId);
    return { error: null as string | null };
  }, []);

  const revertReject = useCallback((id: string, previousStatus: AiReviewItem["status"]) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: previousStatus } : item
      )
    );
  }, []);

  const acceptBulk = useCallback(async (ids: string[], projectId: string) => {
    const previousById = new Map<string, AiReviewItem["status"]>();

    setItems((prev) => {
      for (const item of prev) {
        if (ids.includes(item.id)) {
          previousById.set(item.id, item.status);
        }
      }
      return prev.map((item) =>
        ids.includes(item.id) ? { ...item, status: "accepted" as const } : item
      );
    });

    const results = await Promise.all(
      ids.map((id) => acceptAiReviewItemAction(id, projectId))
    );
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          const previous = previousById.get(item.id);
          return previous && ids.includes(item.id)
            ? { ...item, status: previous }
            : item;
        })
      );
      return { error: errors[0]?.error ?? "Some items could not be approved." };
    }

    dispatchReviewUpdated(projectId);
    return { error: null as string | null };
  }, []);

  return { items, setItems, acceptItem, rejectItem, revertReject, acceptBulk };
}
