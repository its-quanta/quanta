"use server";

import { revalidatePath } from "next/cache";

import type { AiReviewApprovalAction } from "@/src/lib/ai-review/approval-history";
import { AI_REVIEW_COLUMNS } from "@/src/lib/ai-review/constants";
import { mapAiReviewItemRow } from "@/src/lib/ai-review/schema";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { createTakeoffItemAction } from "@/src/lib/takeoff/actions";
import { createClient } from "@/src/lib/supabase/server";
import type {
  AiReviewTradeFocus,
  AnalyseDocumentsResult,
} from "@/src/lib/ai-review/document-analysis/types";
import type { AiReviewItemAdjustInput } from "@/src/types/database";

export type AiReviewActionResult = {
  error?: string;
  takeoffItemId?: string;
};

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

async function recordApprovalEvent(
  organisationId: string,
  projectId: string,
  itemId: string,
  action: AiReviewApprovalAction,
  performedBy: string,
  notes?: string | null,
  segmentId?: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_review_approval_events").insert({
    organisation_id: organisationId,
    project_id: projectId,
    ai_review_item_id: itemId,
    ai_review_segment_id: segmentId ?? null,
    action,
    notes: notes ?? null,
    performed_by: performedBy,
  });

  if (error && !/relation .+ does not exist/i.test(error.message)) {
    console.error("[ai_review_approval_events] recordApprovalEvent:", error.message);
  }
}

async function fetchReviewItem(
  itemId: string,
  projectId: string,
  organisationId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_review_items")
    .select(AI_REVIEW_COLUMNS)
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    return { error: error.message, item: null };
  }

  if (!data) {
    return { error: "Suggestion not found.", item: null };
  }

  return { item: mapAiReviewItemRow(data as Record<string, unknown>) };
}

export async function acceptAiReviewItemAction(
  itemId: string,
  projectId: string
): Promise<AiReviewActionResult> {
  const { profile } = await requireOrganisationProfile();
  const loaded = await fetchReviewItem(
    itemId,
    projectId,
    profile.organisation_id
  );

  if (loaded.error || !loaded.item) {
    return { error: loaded.error ?? "Suggestion not found." };
  }

  const item = loaded.item;

  if (item.status === "accepted" && item.result_takeoff_item_id) {
    return { takeoffItemId: item.result_takeoff_item_id };
  }

  if (item.status === "rejected") {
    return { error: "Rejected suggestions cannot be accepted." };
  }

  const description = item.description.trim();
  if (!description) {
    return { error: "Description is required to accept." };
  }

  const createResult = await createTakeoffItemAction(projectId, {
    trade: item.trade,
    item_name: description,
    description,
    quantity: item.quantity,
    unit: item.unit,
    source_document_id: item.source_document_id,
    drawing_reference: item.drawing_reference,
    page_number: item.page_number,
    sheet_number: item.sheet_number,
    notes: item.review_notes,
    confidence_score: item.confidence,
    ai_generated: true,
    reviewed: false,
    status: "needs_review",
  });

  if (createResult.error || !createResult.itemId) {
    return { error: createResult.error ?? "Could not add takeoff line." };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("ai_review_items")
    .update({
      status: "accepted",
      accepted_by: profile.id,
      accepted_at: new Date().toISOString(),
      result_takeoff_item_id: createResult.itemId,
    })
    .eq("id", itemId)
    .eq("organisation_id", profile.organisation_id);

  if (updateError) {
    return { error: updateError.message };
  }

  await recordApprovalEvent(
    profile.organisation_id,
    projectId,
    itemId,
    "approve",
    profile.id,
    item.review_notes
  );

  revalidateProject(projectId);
  return { takeoffItemId: createResult.itemId };
}

export async function rejectAiReviewItemAction(
  itemId: string,
  projectId: string
): Promise<AiReviewActionResult> {
  const { profile } = await requireOrganisationProfile();
  const loaded = await fetchReviewItem(
    itemId,
    projectId,
    profile.organisation_id
  );

  if (loaded.error || !loaded.item) {
    return { error: loaded.error ?? "Suggestion not found." };
  }

  if (loaded.item.status === "accepted") {
    return { error: "Accepted suggestions cannot be rejected." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_review_items")
    .update({ status: "rejected" })
    .eq("id", itemId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  await recordApprovalEvent(
    profile.organisation_id,
    projectId,
    itemId,
    "reject",
    profile.id,
    loaded.item.review_notes
  );

  revalidateProject(projectId);
  return {};
}

export async function adjustAiReviewItemAction(
  itemId: string,
  projectId: string,
  input: AiReviewItemAdjustInput
): Promise<AiReviewActionResult> {
  const { profile } = await requireOrganisationProfile();
  const loaded = await fetchReviewItem(
    itemId,
    projectId,
    profile.organisation_id
  );

  if (loaded.error || !loaded.item) {
    return { error: loaded.error ?? "Suggestion not found." };
  }

  if (loaded.item.status === "accepted" || loaded.item.status === "rejected") {
    return { error: "This suggestion has already been finalised." };
  }

  const description = input.description.trim();
  const trade = input.trade.trim();

  if (!description) {
    return { error: "Description is required." };
  }

  if (!trade) {
    return { error: "Trade is required." };
  }

  if (input.quantity < 0) {
    return { error: "Quantity cannot be negative." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_review_items")
    .update({
      status: "adjusted",
      description,
      trade,
      quantity: input.quantity,
      unit: input.unit.trim() || "each",
      review_notes: input.review_notes?.trim() || null,
    })
    .eq("id", itemId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  await recordApprovalEvent(
    profile.organisation_id,
    projectId,
    itemId,
    "adjust",
    profile.id,
    input.review_notes?.trim() || null
  );

  revalidateProject(projectId);
  return {};
}

export type AiReviewSegmentActionResult = { error?: string };

export type {
  AiReviewTradeFocus,
  AnalyseDocumentsResult,
} from "@/src/lib/ai-review/document-analysis/types";

/** Quick path: analyse all small supported files (skips large PDFs). */
export async function analyseProjectDocumentsAction(
  projectId: string,
  tradeFocus: AiReviewTradeFocus
): Promise<AnalyseDocumentsResult> {
  const { analyseSmallProjectDocumentsAction } = await import(
    "@/src/lib/ai-review/document-analysis/actions"
  );
  return analyseSmallProjectDocumentsAction(projectId, tradeFocus);
}

export async function fetchAiReviewApprovalHistoryAction(
  itemId: string,
  projectId: string
) {
  const { profile } = await requireOrganisationProfile();
  const { getAiReviewApprovalHistory } = await import("@/src/lib/ai-review/queries");
  const events = await getAiReviewApprovalHistory(
    itemId,
    projectId,
    profile.organisation_id
  );
  return { events };
}

export async function fetchAiReviewSegmentsAction(
  itemId: string,
  projectId: string
) {
  const { profile } = await requireOrganisationProfile();
  const { getAiReviewSegmentsForItem } = await import("@/src/lib/ai-review/queries");
  const segments = await getAiReviewSegmentsForItem(
    itemId,
    projectId,
    profile.organisation_id
  );
  return { segments };
}

/** Future-ready: approve a single overlay segment without accepting the whole item. */
export async function approveAiReviewSegmentAction(
  segmentId: string,
  projectId: string
): Promise<AiReviewSegmentActionResult> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { data: segment, error: fetchError } = await supabase
    .from("ai_review_segments")
    .select("id, ai_review_item_id, organisation_id, project_id")
    .eq("id", segmentId)
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (fetchError) {
    if (/relation .+ does not exist/i.test(fetchError.message)) {
      return { error: "Segment approval is not available yet." };
    }
    return { error: fetchError.message };
  }

  if (!segment) {
    return { error: "Segment not found." };
  }

  const { error } = await supabase
    .from("ai_review_segments")
    .update({ status: "accepted" })
    .eq("id", segmentId);

  if (error) {
    return { error: error.message };
  }

  await recordApprovalEvent(
    profile.organisation_id,
    projectId,
    String(segment.ai_review_item_id),
    "approve",
    profile.id,
    null,
    segmentId
  );

  revalidateProject(projectId);
  return {};
}
