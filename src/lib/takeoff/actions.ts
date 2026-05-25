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
  drawing_reference?: string | null;
  page_number?: number | null;
  notes?: string | null;
  source_document_id?: string | null;
};

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

function buildTakeoffInsertPayloads(
  organisationId: string,
  projectId: string,
  sortOrder: number,
  input: CreateTakeoffItemInput
) {
  const shared = {
    organisation_id: organisationId,
    project_id: projectId,
    trade: input.trade?.trim() || "General",
    item_name: input.item_name.trim(),
    description: input.description?.trim() || null,
    quantity: input.quantity ?? 0,
    unit: input.unit?.trim() || "each",
    drawing_reference: input.drawing_reference?.trim() || null,
    page_number: input.page_number ?? null,
    notes: input.notes?.trim() || null,
    source_document_id: input.source_document_id ?? null,
    ai_generated: false,
    reviewed: false,
    status: "needs_review",
  };

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

function sanitiseUpdate(
  updates: TakeoffItemUpdate
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (updates.source_document_id !== undefined) {
    payload.source_document_id = updates.source_document_id;
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

  if (updates.status !== undefined) {
    payload.status = updates.status;
    if (updates.status === "reviewed" || updates.status === "priced") {
      payload.reviewed = true;
    }
  }

  if (updates.reviewed !== undefined) {
    payload.reviewed = updates.reviewed;
    if (updates.reviewed) {
      payload.status = "reviewed";
    }
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

  const payload = sanitiseUpdate(updates);

  if (Object.keys(payload).length === 0) {
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
        item_name: source.item_name ? `${source.item_name} (copy)` : "",
        description: source.description,
        quantity: source.quantity,
        unit: source.unit,
        drawing_reference: source.drawing_reference,
        page_number: source.page_number,
        notes: source.notes,
        source_document_id: source.source_document_id,
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
  return updateTakeoffItemAction(itemId, projectId, {
    reviewed: true,
    status: "reviewed",
  });
}
