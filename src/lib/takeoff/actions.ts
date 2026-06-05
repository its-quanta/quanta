"use server";

import { revalidatePath } from "next/cache";

import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { isTakeoffStatus } from "@/src/lib/takeoff/constants";
import {
  getNextTakeoffSortOrder,
  insertTakeoffItemWithFallback,
  queryTakeoffItemById,
  updateTakeoffItemWithFallback,
} from "@/src/lib/takeoff/takeoff-schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  OrganisationProfile,
  TakeoffItem,
  TakeoffItemStatus,
  TakeoffItemUpdate,
} from "@/src/types/database";
import type { User } from "@supabase/supabase-js";

export type TakeoffActionResult = {
  error?: string;
  itemId?: string;
};

export type CreateTakeoffItemInput = {
  trade?: string;
  item_name: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  source_document_id?: string | null;
  document_page_id?: string | null;
  drawing_reference?: string | null;
  page_number?: number | null;
  sheet_number?: string | null;
  detail_reference?: string | null;
  specification_reference?: string | null;
  confidence_score?: number | null;
  ai_generated?: boolean;
  notes?: string | null;
  status?: TakeoffItemStatus;
  reviewed?: boolean;
};

type DrawingReferenceInput = Pick<
  CreateTakeoffItemInput,
  | "source_document_id"
  | "drawing_reference"
  | "page_number"
  | "sheet_number"
  | "detail_reference"
  | "specification_reference"
>;

async function assertProjectAccess(
  projectId: string,
  organisationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Project not found." };
  }

  return {};
}

async function requireTakeoffSession(projectId: string): Promise<
  | { error: string }
  | { user: User; profile: OrganisationProfile }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to manage takeoff items." };
  }

  const profile = await getProfileForUser(user.id);

  if (!profile) {
    return { error: "Profile not found. Sign in again." };
  }

  if (!hasOrganisation(profile)) {
    return { error: "Complete onboarding before adding takeoff items." };
  }

  const access = await assertProjectAccess(
    projectId,
    profile.organisation_id
  );

  if (access.error) {
    return { error: access.error };
  }

  return {
    user,
    profile: profile as OrganisationProfile,
  };
}

async function getNextSortOrder(
  projectId: string,
  organisationId: string
): Promise<number> {
  const supabase = await createClient();
  return getNextTakeoffSortOrder(supabase, projectId, organisationId);
}

function resolveCreateStatus(
  status: TakeoffItemStatus | undefined
): { status: TakeoffItemStatus; reviewed: boolean } {
  const resolved = status ?? "needs_review";

  if (resolved === "reviewed") {
    return { status: "reviewed", reviewed: true };
  }

  if (resolved === "priced") {
    return { status: "priced", reviewed: true };
  }

  return { status: resolved, reviewed: false };
}

function appendDrawingReferenceFields(
  target: Record<string, unknown>,
  input: DrawingReferenceInput
) {
  const sourceDocumentId = input.source_document_id ?? null;
  target.source_document_id = sourceDocumentId;
  target.drawing_reference = input.drawing_reference?.trim() || null;
  target.page_number = input.page_number ?? null;
  target.sheet_number = input.sheet_number?.trim() || null;
  target.detail_reference = input.detail_reference?.trim() || null;
  target.specification_reference =
    input.specification_reference?.trim() || null;
  target.confidence_score = null;
}

function buildTakeoffInsertPayloads(
  organisationId: string,
  projectId: string,
  sortOrder: number,
  input: CreateTakeoffItemInput
) {
  const { status, reviewed } = resolveCreateStatus(input.status);

  const shared: Record<string, unknown> = {
    organisation_id: organisationId,
    project_id: projectId,
    trade: input.trade?.trim() || "General",
    item_name: input.item_name.trim(),
    description: input.description?.trim() || null,
    quantity: input.quantity ?? 0,
    unit: input.unit?.trim() || "each",
    notes: input.notes?.trim() || null,
    confidence_score:
      input.confidence_score === undefined ? null : input.confidence_score,
    ai_generated: Boolean(input.ai_generated),
    reviewed: input.reviewed ?? reviewed,
    status,
  };

  appendDrawingReferenceFields(shared, input);

  return [
    { ...shared, sort_order: sortOrder },
    { ...shared },
    {
      organisation_id: organisationId,
      project_id: projectId,
      description: input.description?.trim() || input.item_name.trim(),
      quantity: input.quantity ?? 0,
      unit: input.unit?.trim() || "each",
      notes: input.notes?.trim() || null,
    },
  ];
}

function applyReviewWorkflow(
  current: TakeoffItem,
  updates: TakeoffItemUpdate
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (updates.source_document_id !== undefined) {
    payload.source_document_id = updates.source_document_id;
  }

  if (updates.sheet_number !== undefined) {
    payload.sheet_number = updates.sheet_number?.trim() || null;
  }

  if (updates.detail_reference !== undefined) {
    payload.detail_reference = updates.detail_reference?.trim() || null;
  }

  if (updates.specification_reference !== undefined) {
    payload.specification_reference =
      updates.specification_reference?.trim() || null;
  }

  if (updates.trade !== undefined) {
    payload.trade = updates.trade.trim() || "General";
  }

  if (updates.item_name !== undefined) {
    payload.item_name = updates.item_name;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description;
  }

  if (updates.quantity !== undefined) {
    payload.quantity = updates.quantity;
  }

  if (updates.unit !== undefined) {
    payload.unit = updates.unit.trim() || "each";
  }

  if (updates.drawing_reference !== undefined) {
    payload.drawing_reference = updates.drawing_reference;
  }

  if (updates.page_number !== undefined) {
    payload.page_number = updates.page_number;
  }

  if (updates.notes !== undefined) {
    payload.notes = updates.notes;
  }

  const touchesReview =
    updates.reviewed !== undefined || updates.status !== undefined;

  if (touchesReview) {
    let nextStatus = updates.status ?? current.status;
    let nextReviewed =
      updates.reviewed !== undefined ? updates.reviewed : current.reviewed;

    if (updates.status !== undefined) {
      nextStatus = updates.status;
      if (updates.status === "reviewed" || updates.status === "priced") {
        nextReviewed = true;
      } else if (
        updates.status === "needs_review" ||
        updates.status === "draft" ||
        updates.status === "ai_draft"
      ) {
        if (updates.reviewed !== true) {
          nextReviewed = false;
        }
      }
    }

    if (updates.reviewed === true) {
      nextReviewed = true;
      if (current.status === "priced") {
        nextStatus = "priced";
      } else if (current.status !== "excluded") {
        nextStatus =
          updates.status && updates.status !== current.status
            ? updates.status
            : "reviewed";
      }
    }

    if (updates.reviewed === false) {
      nextReviewed = false;
      if (current.status !== "excluded" && nextStatus !== "excluded") {
        nextStatus = "needs_review";
      }
    }

    payload.status = nextStatus;
    payload.reviewed = nextReviewed;
  }

  return payload;
}

async function fetchTakeoffItem(itemId: string, organisationId: string) {
  const supabase = await createClient();
  return queryTakeoffItemById(supabase, itemId, organisationId);
}

export async function createTakeoffItemAction(
  projectId: string,
  input: CreateTakeoffItemInput
): Promise<TakeoffActionResult> {
  if (!projectId) {
    return { error: "Project not found." };
  }

  const itemName = input.item_name?.trim();
  if (!itemName) {
    return { error: "Enter an item name." };
  }

  if (input.status && !isTakeoffStatus(input.status)) {
    return { error: "Invalid status." };
  }

  if (input.quantity !== undefined && input.quantity < 0) {
    return { error: "Quantity cannot be negative." };
  }

  if (
    input.page_number !== undefined &&
    input.page_number !== null &&
    input.page_number <= 0
  ) {
    return { error: "Page number must be greater than zero." };
  }

  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const { profile } = session;
  const supabase = await createClient();
  const sortOrder = await getNextSortOrder(
    projectId,
    profile.organisation_id
  );

  const { itemId, error } = await insertTakeoffItemWithFallback(
    supabase,
    buildTakeoffInsertPayloads(
      profile.organisation_id,
      projectId,
      sortOrder,
      { ...input, item_name: itemName }
    )
  );

  if (error) {
    return { error };
  }

  revalidatePath(`/projects/${projectId}`);

  return itemId ? { itemId } : {};
}

export async function updateTakeoffItemAction(
  itemId: string,
  projectId: string,
  updates: TakeoffItemUpdate
): Promise<TakeoffActionResult> {
  if (!itemId || !projectId) {
    return { error: "Takeoff item not found." };
  }

  if (updates.status && !isTakeoffStatus(updates.status)) {
    return { error: "Invalid status." };
  }

  if (updates.quantity !== undefined && updates.quantity < 0) {
    return { error: "Quantity cannot be negative." };
  }

  if (
    updates.page_number !== undefined &&
    updates.page_number !== null &&
    updates.page_number <= 0
  ) {
    return { error: "Page number must be greater than zero." };
  }

  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const existing = await fetchTakeoffItem(
    itemId,
    session.profile.organisation_id
  );

  if (!existing || existing.project_id !== projectId) {
    return { error: "Takeoff item not found." };
  }

  const payload = applyReviewWorkflow(existing, updates);

  const fieldKeys = [
    "source_document_id",
    "trade",
    "item_name",
    "description",
    "quantity",
    "unit",
    "drawing_reference",
    "page_number",
    "sheet_number",
    "detail_reference",
    "specification_reference",
    "notes",
    "status",
    "reviewed",
  ] as const;

  const hasChanges = fieldKeys.some((key) => key in updates);

  if (!hasChanges) {
    return {};
  }

  const supabase = await createClient();

  const { error } = await updateTakeoffItemWithFallback(
    supabase,
    itemId,
    projectId,
    session.profile.organisation_id,
    payload
  );

  if (error) {
    return { error };
  }

  revalidatePath(`/projects/${projectId}`);

  return {};
}

export async function deleteTakeoffItemAction(
  itemId: string,
  projectId: string
): Promise<TakeoffActionResult> {
  if (!itemId || !projectId) {
    return { error: "Takeoff item not found." };
  }

  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("takeoff_items")
    .delete()
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);

  return {};
}

export async function duplicateTakeoffItemAction(
  itemId: string,
  projectId: string
): Promise<TakeoffActionResult> {
  if (!itemId || !projectId) {
    return { error: "Takeoff item not found." };
  }

  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const source = await fetchTakeoffItem(
    itemId,
    session.profile.organisation_id
  );

  if (!source || source.project_id !== projectId) {
    return { error: "Takeoff item not found." };
  }

  const supabase = await createClient();
  const sortOrder = await getNextSortOrder(
    projectId,
    session.profile.organisation_id
  );

  const { itemId: createdItemId, error } = await insertTakeoffItemWithFallback(
    supabase,
    buildTakeoffInsertPayloads(
      session.profile.organisation_id,
      projectId,
      sortOrder,
      {
        trade: source.trade,
        item_name: source.item_name,
        description: source.description,
        quantity: source.quantity,
        unit: source.unit,
        source_document_id: source.source_document_id,
        drawing_reference: source.drawing_reference,
        page_number: source.page_number,
        sheet_number: source.sheet_number,
        detail_reference: source.detail_reference,
        specification_reference: source.specification_reference,
        notes: source.notes,
        status: "needs_review",
      }
    )
  );

  if (error) {
    return { error };
  }

  revalidatePath(`/projects/${projectId}`);

  return createdItemId ? { itemId: createdItemId } : {};
}

export async function markTakeoffItemReviewedAction(
  itemId: string,
  projectId: string
): Promise<TakeoffActionResult> {
  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const existing = await fetchTakeoffItem(
    itemId,
    session.profile.organisation_id
  );

  if (!existing || existing.project_id !== projectId) {
    return { error: "Takeoff item not found." };
  }

  const status: TakeoffItemStatus =
    existing.status === "priced" ? "priced" : "reviewed";

  return updateTakeoffItemAction(itemId, projectId, {
    reviewed: true,
    status,
  });
}

export async function markTakeoffItemUnreviewedAction(
  itemId: string,
  projectId: string
): Promise<TakeoffActionResult> {
  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const existing = await fetchTakeoffItem(
    itemId,
    session.profile.organisation_id
  );

  if (!existing || existing.project_id !== projectId) {
    return { error: "Takeoff item not found." };
  }

  if (existing.status === "excluded") {
    return updateTakeoffItemAction(itemId, projectId, { reviewed: false });
  }

  return updateTakeoffItemAction(itemId, projectId, {
    reviewed: false,
    status: "needs_review",
  });
}

export async function fetchTakeoffItemsForProjectAction(projectId: string) {
  const session = await requireTakeoffSession(projectId);

  if ("error" in session) {
    return { items: [] as TakeoffItem[], error: session.error };
  }

  const supabase = await createClient();
  const { queryTakeoffItemsForProject } = await import(
    "@/src/lib/takeoff/takeoff-schema"
  );
  const items = await queryTakeoffItemsForProject(
    supabase,
    projectId,
    session.profile.organisation_id
  );

  return { items, error: null as string | null };
}
