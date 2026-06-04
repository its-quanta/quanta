"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { takeoffIdsSignature } from "@/components/scope/scope-review-utils";
import { fetchTakeoffItemsForProjectAction } from "@/src/lib/takeoff/actions";
import type { TakeoffItem } from "@/src/types/database";

export function useScopeTakeoffItems(
  initialItems: TakeoffItem[],
  projectId: string
) {
  const [items, setItems] = useState(initialItems);
  const syncedIdsRef = useRef(takeoffIdsSignature(initialItems));

  useEffect(() => {
    const nextSignature = takeoffIdsSignature(initialItems);
    if (nextSignature !== syncedIdsRef.current) {
      syncedIdsRef.current = nextSignature;
      setItems(initialItems);
    }
  }, [initialItems]);

  const refresh = useCallback(async () => {
    const result = await fetchTakeoffItemsForProjectAction(projectId);
    if (!result.error) {
      syncedIdsRef.current = takeoffIdsSignature(result.items);
      setItems(result.items);
    }
    return result;
  }, [projectId]);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (detail?.projectId && detail.projectId !== projectId) {
        return;
      }
      void refresh();
    };

    window.addEventListener("quanta:ai-review-updated", handleUpdated);
    return () => {
      window.removeEventListener("quanta:ai-review-updated", handleUpdated);
    };
  }, [projectId, refresh]);

  const patchItem = useCallback(
    (itemId: string, patch: Partial<TakeoffItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
      );
    },
    []
  );

  return { items, setItems, refresh, patchItem };
}
