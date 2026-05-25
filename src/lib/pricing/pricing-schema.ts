import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError } from "@/src/lib/auth/profile-schema";
import { calculateSellRate } from "@/src/lib/pricing/calculations";
import type { PricingItem, PricingMethod } from "@/src/types/database";

export const PRICING_ITEM_SELECT_FULL =
  "id, organisation_id, project_id, takeoff_item_id, pricing_method, quantity, unit, cost_rate, total_cost, markup_percentage, margin_percentage, sell_rate, sell_rate_overridden, total_sell, gross_profit, notes, created_at, updated_at" as const;

export const PRICING_ITEM_SELECT_BASE =
  "id, organisation_id, project_id, takeoff_item_id, pricing_method, quantity, unit, cost_rate, total_cost, markup_percentage, margin_percentage, sell_rate, total_sell, gross_profit, notes, created_at, updated_at" as const;

const PRICING_ITEM_SELECT_FALLBACKS = [
  PRICING_ITEM_SELECT_FULL,
  PRICING_ITEM_SELECT_BASE,
] as const;

export type PricingItemRow = {
  id: string;
  organisation_id: string;
  project_id: string;
  takeoff_item_id: string;
  pricing_method: PricingMethod;
  quantity: number;
  unit: string;
  cost_rate: number;
  total_cost: number;
  markup_percentage: number | null;
  margin_percentage: number | null;
  sell_rate: number;
  sell_rate_overridden?: boolean;
  total_sell: number;
  gross_profit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function inferSellRateOverridden(row: PricingItemRow): boolean {
  if (row.sell_rate_overridden !== undefined) {
    return row.sell_rate_overridden;
  }

  const calculated = calculateSellRate({
    cost_rate: Number(row.cost_rate),
    markup_percentage:
      row.markup_percentage !== null ? Number(row.markup_percentage) : null,
    margin_percentage:
      row.margin_percentage !== null ? Number(row.margin_percentage) : null,
    sell_rate_overridden: false,
  });

  return Math.abs(Number(row.sell_rate) - calculated) > 0.005;
}

export function normalizePricingItem(row: PricingItemRow): PricingItem {
  const sellRateOverridden = inferSellRateOverridden(row);

  return {
    id: row.id,
    organisation_id: row.organisation_id,
    project_id: row.project_id,
    takeoff_item_id: row.takeoff_item_id,
    pricing_method: row.pricing_method,
    quantity: Number(row.quantity),
    unit: row.unit,
    cost_rate: Number(row.cost_rate),
    total_cost: Number(row.total_cost),
    markup_percentage:
      row.markup_percentage !== null ? Number(row.markup_percentage) : null,
    margin_percentage:
      row.margin_percentage !== null ? Number(row.margin_percentage) : null,
    sell_rate: Number(row.sell_rate),
    sell_rate_overridden: sellRateOverridden,
    total_sell: Number(row.total_sell),
    gross_profit: Number(row.gross_profit),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type SupabaseQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

async function queryWithPricingSelectFallback<T>(
  run: (select: string) => Promise<SupabaseQueryResult>
): Promise<{ data: T; error: string | null }> {
  let lastError: string | null = null;

  for (const select of PRICING_ITEM_SELECT_FALLBACKS) {
    const { data, error } = await run(select);

    if (!error) {
      return { data: data as T, error: null };
    }

    lastError = error.message;

    if (!isMissingColumnError(error.message)) {
      return { data: data as T, error: error.message };
    }
  }

  return { data: null as T, error: lastError };
}

const TAKEOFF_EMBED_SELECT =
  "takeoff_item:takeoff_items(id, item_name, trade, quantity, unit, status)" as const;

export type PricingItemWithTakeoffRow = PricingItemRow & {
  takeoff_item?:
    | {
        id: string;
        item_name: string;
        trade: string;
        quantity: number;
        unit: string;
        status: string;
      }
    | {
        id: string;
        item_name: string;
        trade: string;
        quantity: number;
        unit: string;
        status: string;
      }[]
    | null;
};

export async function queryPricingItemsWithTakeoffForProject(
  supabase: SupabaseClient,
  projectId: string,
  organisationId: string
): Promise<{ rows: PricingItemWithTakeoffRow[]; error: string | null }> {
  const { data, error } = await queryWithPricingSelectFallback<
    PricingItemWithTakeoffRow[] | null
  >(async (select) =>
    supabase
      .from("pricing_items")
      .select(`${select}, ${TAKEOFF_EMBED_SELECT}`)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true })
  );

  if (error) {
    return { rows: [], error };
  }

  return { rows: data ?? [], error: null };
}

export async function insertPricingItemWithFallback(
  supabase: SupabaseClient,
  payloads: {
    full: Record<string, unknown>;
    base: Record<string, unknown>;
  }
): Promise<{ pricingItemId: string | null; error: string | null }> {
  for (const payload of [payloads.full, payloads.base]) {
    const { data, error } = await supabase
      .from("pricing_items")
      .insert(payload)
      .select("id")
      .single();

    if (!error) {
      return { pricingItemId: data.id, error: null };
    }

    if (!isMissingColumnError(error.message)) {
      return { pricingItemId: null, error: error.message };
    }
  }

  return { pricingItemId: null, error: "Failed to save pricing item." };
}

export async function updatePricingItemWithFallback(
  supabase: SupabaseClient,
  pricingItemId: string,
  projectId: string,
  organisationId: string,
  payloads: {
    full: Record<string, unknown>;
    base: Record<string, unknown>;
  }
): Promise<{ error: string | null }> {
  for (const payload of [payloads.full, payloads.base]) {
    const { error } = await supabase
      .from("pricing_items")
      .update(payload)
      .eq("id", pricingItemId)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId);

    if (!error) {
      return { error: null };
    }

    if (!isMissingColumnError(error.message)) {
      return { error: error.message };
    }
  }

  return { error: "Failed to update pricing item." };
}

export async function queryPricingItemById(
  supabase: SupabaseClient,
  pricingItemId: string,
  projectId: string,
  organisationId: string
): Promise<{ row: PricingItemRow | null; error: string | null }> {
  const { data, error } = await queryWithPricingSelectFallback<PricingItemRow | null>(
    async (select) =>
      supabase
        .from("pricing_items")
        .select(select)
        .eq("id", pricingItemId)
        .eq("project_id", projectId)
        .eq("organisation_id", organisationId)
        .maybeSingle()
  );

  if (error) {
    return { row: null, error };
  }

  return { row: data, error: null };
}
