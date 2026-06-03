import {
  AI_REVIEW_COLUMN_SELECT_ATTEMPTS,
} from "@/src/lib/ai-review/constants";
import { mapAiReviewItemRow } from "@/src/lib/ai-review/schema";
import { createClient } from "@/src/lib/supabase/server";
import type { AiReviewItem } from "@/src/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isMissingColumnError(message: string): boolean {
  return /column .+ does not exist/i.test(message);
}

export async function fetchReviewItemById(
  itemId: string,
  projectId: string,
  organisationId: string
): Promise<{ item: AiReviewItem | null; error?: string }> {
  const supabase = await createClient();
  let lastError: string | null = null;

  for (const selectColumns of AI_REVIEW_COLUMN_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("ai_review_items")
      .select(selectColumns)
      .eq("id", itemId)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId)
      .maybeSingle();

    if (!error) {
      if (!data) {
        return { item: null, error: "Suggestion not found." };
      }

      return {
        item: mapAiReviewItemRow(data as unknown as Record<string, unknown>),
      };
    }

    lastError = error.message;

    if (isMissingColumnError(error.message)) {
      continue;
    }

    return { item: null, error: error.message };
  }

  return {
    item: null,
    error: lastError ?? "Suggestion not found.",
  };
}

export async function updateReviewItemWithFallback(
  supabase: SupabaseClient,
  itemId: string,
  organisationId: string,
  payloads: Record<string, unknown>[]
): Promise<{ error: string | null }> {
  let lastError: string | null = null;

  for (const payload of payloads) {
    const { error } = await supabase
      .from("ai_review_items")
      .update(payload)
      .eq("id", itemId)
      .eq("organisation_id", organisationId);

    if (!error) {
      return { error: null };
    }

    lastError = error.message;

    if (isMissingColumnError(error.message)) {
      continue;
    }

    return { error: error.message };
  }

  return { error: lastError ?? "Could not update suggestion." };
}

export async function markReviewItemAccepted(
  supabase: SupabaseClient,
  itemId: string,
  projectId: string,
  organisationId: string,
  takeoffItemId: string,
  acceptedBy: string,
  acceptedAt: string
): Promise<{ error: string | null }> {
  const { error: rpcError } = await supabase.rpc("mark_ai_review_item_accepted", {
    p_item_id: itemId,
    p_project_id: projectId,
    p_takeoff_item_id: takeoffItemId,
  });

  if (!rpcError) {
    return { error: null };
  }

  if (!/could not find the function|function .* does not exist/i.test(rpcError.message)) {
    if (!isMissingColumnError(rpcError.message)) {
      return { error: rpcError.message };
    }
  }

  return updateReviewItemWithFallback(supabase, itemId, organisationId, [
    {
      status: "accepted",
      accepted_by: acceptedBy,
      accepted_at: acceptedAt,
      result_takeoff_item_id: takeoffItemId,
    },
    {
      status: "accepted",
      accepted_by: acceptedBy,
      accepted_at: acceptedAt,
    },
    {
      status: "accepted",
    },
  ]);
}
