"use server";

import { revalidatePath } from "next/cache";

import { AI_REVIEW_COLUMNS } from "@/src/lib/ai-review/constants";
import { mapAiReviewItemRow } from "@/src/lib/ai-review/schema";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { createTakeoffItemAction } from "@/src/lib/takeoff/actions";
import { createClient } from "@/src/lib/supabase/server";
import type { AiReviewItemAdjustInput } from "@/src/types/database";

export type AiReviewActionResult = {
  error?: string;
  takeoffItemId?: string;
};

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
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

  revalidateProject(projectId);
  return {};
}
