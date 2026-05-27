import {
  AI_REVIEW_APPROVAL_EVENT_COLUMNS,
  mapAiReviewApprovalEventRow,
  type AiReviewApprovalEvent,
} from "@/src/lib/ai-review/approval-history";
import { AI_REVIEW_COLUMNS } from "@/src/lib/ai-review/constants";
import { mapAiReviewItemRow } from "@/src/lib/ai-review/schema";
import {
  AI_REVIEW_SEGMENT_COLUMNS,
  mapAiReviewSegmentRow,
  type AiReviewSegment,
} from "@/src/lib/ai-review/segments";
import { createClient } from "@/src/lib/supabase/server";
import type { AiReviewItem } from "@/src/types/database";

export async function getAiReviewItemsForProject(
  projectId: string,
  organisationId: string
): Promise<AiReviewItem[]> {
  if (!organisationId) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_review_items")
    .select(AI_REVIEW_COLUMNS)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[ai_review_items] getAiReviewItemsForProject:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapAiReviewItemRow(row as Record<string, unknown>)
  );
}

export async function getAiReviewSegmentsForItem(
  itemId: string,
  projectId: string,
  organisationId: string
): Promise<AiReviewSegment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_review_segments")
    .select(AI_REVIEW_SEGMENT_COLUMNS)
    .eq("ai_review_item_id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("segment_key", { ascending: true });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[ai_review_segments] getAiReviewSegmentsForItem:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapAiReviewSegmentRow(row as Record<string, unknown>)
  );
}

export async function getAiReviewApprovalHistory(
  itemId: string,
  projectId: string,
  organisationId: string
): Promise<AiReviewApprovalEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_review_approval_events")
    .select(AI_REVIEW_APPROVAL_EVENT_COLUMNS)
    .eq("ai_review_item_id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[ai_review_approval_events] getAiReviewApprovalHistory:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapAiReviewApprovalEventRow(row as Record<string, unknown>)
  );
}
