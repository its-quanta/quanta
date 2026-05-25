"use server";

import { revalidatePath } from "next/cache";

import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import {
  calculatePricingTotals,
  computePricingCompletionPercent,
  normaliseMarkupMargin,
} from "@/src/lib/pricing/calculations";
import { isPricingMethod } from "@/src/lib/pricing/constants";
import { countPricingItemsForTakeoff } from "@/src/lib/pricing/queries";
import {
  insertPricingItemWithFallback,
  normalizePricingItem,
  queryPricingItemById,
  updatePricingItemWithFallback,
} from "@/src/lib/pricing/pricing-schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  OrganisationProfile,
  PricingItemInput,
  PricingItemUpdate,
  TakeoffItem,
} from "@/src/types/database";
import type { User } from "@supabase/supabase-js";

export type PricingActionResult = {
  error?: string;
  pricingItemId?: string;
};

function formatSupabaseError(error: {
  message: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => Boolean(part && part.trim())
  );

  return parts.join(" — ");
}

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

async function requirePricingSession(projectId: string): Promise<
  | { error: string }
  | { user: User; profile: OrganisationProfile }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to manage pricing." };
  }

  const profile = await getProfileForUser(user.id);

  if (!profile) {
    return { error: "Profile not found. Sign in again." };
  }

  if (!hasOrganisation(profile)) {
    return { error: "Complete onboarding before adding pricing." };
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

async function fetchTakeoffItemForPricing(
  takeoffItemId: string,
  projectId: string,
  organisationId: string
): Promise<TakeoffItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("takeoff_items")
    .select("id, project_id, organisation_id, status, quantity, unit")
    .eq("id", takeoffItemId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.project_id !== projectId) {
    return null;
  }

  return data as TakeoffItem;
}

function validateMarkupMargin(
  markup: number | null | undefined,
  margin: number | null | undefined
): string | null {
  // Margin takes priority when both are supplied (markup is cleared before save).
  const { markup_percentage, margin_percentage } = normaliseMarkupMargin(
    markup,
    margin
  );

  if (margin_percentage !== null && margin_percentage >= 100) {
    return "Margin must be below 100%.";
  }

  if (markup_percentage !== null && markup_percentage < 0) {
    return "Markup cannot be negative.";
  }

  if (margin_percentage !== null && margin_percentage < 0) {
    return "Margin cannot be negative.";
  }

  return null;
}

function buildPricingPayload(
  input: PricingItemInput | (PricingItemUpdate & { takeoff_item_id?: string }),
  base?: {
    quantity: number;
    cost_rate: number;
    markup_percentage: number | null;
    margin_percentage: number | null;
    sell_rate: number;
    sell_rate_overridden: boolean;
  }
) {
  const quantity = input.quantity ?? base?.quantity ?? 0;
  const cost_rate = input.cost_rate ?? base?.cost_rate ?? 0;

  if (quantity < 0 || cost_rate < 0) {
    return { error: "Quantity and cost rate cannot be negative." };
  }

  const markupInput =
    input.markup_percentage !== undefined
      ? input.markup_percentage
      : base?.markup_percentage;
  const marginInput =
    input.margin_percentage !== undefined
      ? input.margin_percentage
      : base?.margin_percentage;

  const validationError = validateMarkupMargin(markupInput, marginInput);
  if (validationError) {
    return { error: validationError };
  }

  const sellRateOverridden =
    input.sell_rate_overridden ?? base?.sell_rate_overridden ?? false;

  const totals = calculatePricingTotals({
    quantity,
    cost_rate,
    markup_percentage: markupInput,
    margin_percentage: marginInput,
    sell_rate: input.sell_rate ?? base?.sell_rate,
    sell_rate_overridden: sellRateOverridden,
  });

  return {
    payload: {
      quantity,
      cost_rate,
      markup_percentage: totals.markup_percentage,
      margin_percentage: totals.margin_percentage,
      sell_rate: totals.sell_rate,
      sell_rate_overridden: sellRateOverridden,
      total_cost: totals.total_cost,
      total_sell: totals.total_sell,
      gross_profit: totals.gross_profit,
    },
  };
}

export async function syncTakeoffItemPricingStatus(
  takeoffItemId: string,
  projectId: string,
  organisationId: string,
  mode: "priced" | "revert"
): Promise<void> {
  const supabase = await createClient();

  if (mode === "priced") {
    await supabase
      .from("takeoff_items")
      .update({ status: "priced", reviewed: true })
      .eq("id", takeoffItemId)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId);
    return;
  }

  const remaining = await countPricingItemsForTakeoff(
    takeoffItemId,
    organisationId
  );

  if (remaining === 0) {
    const { data: takeoff } = await supabase
      .from("takeoff_items")
      .select("status")
      .eq("id", takeoffItemId)
      .maybeSingle();

    if (takeoff?.status === "priced") {
      await supabase
        .from("takeoff_items")
        .update({ status: "needs_review", reviewed: false })
        .eq("id", takeoffItemId)
        .eq("project_id", projectId)
        .eq("organisation_id", organisationId);
    }
  }
}

export async function syncProjectPricingTotals(
  projectId: string,
  organisationId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: pricingRows, error: pricingError } = await supabase
    .from("pricing_items")
    .select("total_sell")
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  if (pricingError) {
    return;
  }

  const estimatedValue = (pricingRows ?? []).reduce(
    (sum, row) => sum + Number(row.total_sell ?? 0),
    0
  );

  const { data: takeoffRows, error: takeoffError } = await supabase
    .from("takeoff_items")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  if (takeoffError) {
    return;
  }

  const priceable = (takeoffRows ?? []).filter((row) => row.status !== "excluded");
  const pricedTakeoffIds = new Set<string>();

  const { data: linkedPricing } = await supabase
    .from("pricing_items")
    .select("takeoff_item_id")
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  for (const row of linkedPricing ?? []) {
    pricedTakeoffIds.add(row.takeoff_item_id);
  }

  const pricingCompletion = computePricingCompletionPercent(
    priceable.filter((row) => pricedTakeoffIds.has(row.id)).length,
    priceable.length
  );

  const updatePayload: Record<string, number | null> = {
    estimated_value: estimatedValue,
  };

  if (pricingCompletion !== null) {
    updatePayload.pricing_completion = pricingCompletion;
  } else {
    updatePayload.pricing_completion = null;
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId)
    .eq("organisation_id", organisationId);

  if (updateError && updateError.message.includes("pricing_completion")) {
    await supabase
      .from("projects")
      .update({ estimated_value: estimatedValue })
      .eq("id", projectId)
      .eq("organisation_id", organisationId);
  }
}

export async function createPricingItemAction(
  projectId: string,
  input: PricingItemInput
): Promise<PricingActionResult> {
  if (!projectId) {
    return { error: "Project not found." };
  }

  if (!input.takeoff_item_id) {
    return { error: "Select a takeoff item." };
  }

  if (!isPricingMethod(input.pricing_method)) {
    return { error: "Invalid pricing method." };
  }

  const session = await requirePricingSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const takeoff = await fetchTakeoffItemForPricing(
    input.takeoff_item_id,
    projectId,
    session.profile.organisation_id
  );

  if (!takeoff) {
    return { error: "Takeoff item not found." };
  }

  if (takeoff.status === "excluded") {
    return { error: "Cannot price an excluded takeoff line." };
  }

  const built = buildPricingPayload(input);

  if ("error" in built) {
    return { error: built.error };
  }

  const supabase = await createClient();
  const { payload } = built;

  const sharedInsert = {
    organisation_id: session.profile.organisation_id,
    project_id: projectId,
    takeoff_item_id: input.takeoff_item_id,
    pricing_method: input.pricing_method,
    quantity: payload.quantity,
    unit: input.unit.trim() || "each",
    cost_rate: payload.cost_rate,
    markup_percentage: payload.markup_percentage,
    margin_percentage: payload.margin_percentage,
    sell_rate: payload.sell_rate,
    total_cost: payload.total_cost,
    total_sell: payload.total_sell,
    gross_profit: payload.gross_profit,
    notes: input.notes?.trim() || null,
  };

  const { pricingItemId, error } = await insertPricingItemWithFallback(supabase, {
    full: {
      ...sharedInsert,
      sell_rate_overridden: payload.sell_rate_overridden,
    },
    base: sharedInsert,
  });

  if (error) {
    return { error: formatSupabaseError({ message: error }) };
  }

  if (!pricingItemId) {
    return { error: "Failed to save pricing item." };
  }

  await syncTakeoffItemPricingStatus(
    input.takeoff_item_id,
    projectId,
    session.profile.organisation_id,
    "priced"
  );
  await syncProjectPricingTotals(projectId, session.profile.organisation_id);

  revalidatePath(`/projects/${projectId}`);

  return { pricingItemId };
}

export async function updatePricingItemAction(
  pricingItemId: string,
  projectId: string,
  updates: PricingItemUpdate
): Promise<PricingActionResult> {
  if (!pricingItemId || !projectId) {
    return { error: "Pricing item not found." };
  }

  if (updates.pricing_method && !isPricingMethod(updates.pricing_method)) {
    return { error: "Invalid pricing method." };
  }

  const session = await requirePricingSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();

  const { row: existingRow, error: fetchError } = await queryPricingItemById(
    supabase,
    pricingItemId,
    projectId,
    session.profile.organisation_id
  );

  if (fetchError) {
    return { error: formatSupabaseError({ message: fetchError }) };
  }

  if (!existingRow) {
    return { error: "Pricing item not found." };
  }

  const existing = normalizePricingItem(existingRow);

  const built = buildPricingPayload(
    {
      ...updates,
      quantity: updates.quantity ?? existing.quantity,
      cost_rate: updates.cost_rate ?? existing.cost_rate,
      markup_percentage:
        updates.markup_percentage !== undefined
          ? updates.markup_percentage
          : existing.markup_percentage,
      margin_percentage:
        updates.margin_percentage !== undefined
          ? updates.margin_percentage
          : existing.margin_percentage,
      sell_rate: updates.sell_rate ?? existing.sell_rate,
      sell_rate_overridden:
        updates.sell_rate_overridden ?? existing.sell_rate_overridden,
    },
    {
      quantity: existing.quantity,
      cost_rate: existing.cost_rate,
      markup_percentage: existing.markup_percentage,
      margin_percentage: existing.margin_percentage,
      sell_rate: existing.sell_rate,
      sell_rate_overridden: existing.sell_rate_overridden,
    }
  );

  if ("error" in built) {
    return { error: built.error };
  }

  const updatePayload: Record<string, unknown> = { ...built.payload };

  if (updates.pricing_method !== undefined) {
    updatePayload.pricing_method = updates.pricing_method;
  }

  if (updates.unit !== undefined) {
    updatePayload.unit = updates.unit.trim() || "each";
  }

  if (updates.notes !== undefined) {
    updatePayload.notes = updates.notes?.trim() || null;
  }

  const { error } = await updatePricingItemWithFallback(
    supabase,
    pricingItemId,
    projectId,
    session.profile.organisation_id,
    {
      full: updatePayload,
      base: Object.fromEntries(
        Object.entries(updatePayload).filter(
          ([key]) => key !== "sell_rate_overridden"
        )
      ),
    }
  );

  if (error) {
    return { error: formatSupabaseError({ message: error }) };
  }

  await syncTakeoffItemPricingStatus(
    existing.takeoff_item_id,
    projectId,
    session.profile.organisation_id,
    "priced"
  );
  await syncProjectPricingTotals(projectId, session.profile.organisation_id);

  revalidatePath(`/projects/${projectId}`);

  return {};
}

export async function deletePricingItemAction(
  pricingItemId: string,
  projectId: string
): Promise<PricingActionResult> {
  if (!pricingItemId || !projectId) {
    return { error: "Pricing item not found." };
  }

  const session = await requirePricingSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("pricing_items")
    .select("id, takeoff_item_id")
    .eq("id", pricingItemId)
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id)
    .maybeSingle();

  if (fetchError) {
    return { error: formatSupabaseError(fetchError) };
  }

  if (!existing) {
    return { error: "Pricing item not found." };
  }

  const { error } = await supabase
    .from("pricing_items")
    .delete()
    .eq("id", pricingItemId)
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id);

  if (error) {
    return { error: formatSupabaseError(error) };
  }

  await syncTakeoffItemPricingStatus(
    existing.takeoff_item_id,
    projectId,
    session.profile.organisation_id,
    "revert"
  );
  await syncProjectPricingTotals(projectId, session.profile.organisation_id);

  revalidatePath(`/projects/${projectId}`);

  return {};
}
