import { createClient } from "@/src/lib/supabase/server";
import {
  normalizePricingItem,
  queryPricingItemsWithTakeoffForProject,
  type PricingItemWithTakeoffRow,
} from "@/src/lib/pricing/pricing-schema";
import type { PricingItem, TakeoffItem } from "@/src/types/database";

export type PricingItemWithTakeoff = PricingItem & {
  takeoff_item: Pick<
    TakeoffItem,
    "id" | "item_name" | "trade" | "quantity" | "unit" | "status"
  >;
};

function resolveTakeoffEmbed(
  row: PricingItemWithTakeoffRow
): PricingItemWithTakeoff["takeoff_item"] {
  const raw = row.takeoff_item;
  const takeoff = Array.isArray(raw) ? raw[0] : raw;

  if (takeoff) {
    return {
      id: takeoff.id,
      item_name: takeoff.item_name,
      trade: takeoff.trade,
      quantity: Number(takeoff.quantity),
      unit: takeoff.unit,
      status: takeoff.status as TakeoffItem["status"],
    };
  }

  return {
    id: row.takeoff_item_id,
    item_name: "Unknown item",
    trade: "General",
    quantity: 0,
    unit: "each",
    status: "needs_review",
  };
}

export async function getPricingItemsForProject(
  projectId: string,
  organisationId: string
): Promise<PricingItemWithTakeoff[]> {
  const supabase = await createClient();

  const { rows, error } = await queryPricingItemsWithTakeoffForProject(
    supabase,
    projectId,
    organisationId
  );

  if (error) {
    if (/relation .+ does not exist/i.test(error)) {
      return [];
    }
    throw new Error(error);
  }

  return rows.map((row) => ({
    ...normalizePricingItem(row),
    takeoff_item: resolveTakeoffEmbed(row),
  }));
}

export async function countPricingItemsForTakeoff(
  takeoffItemId: string,
  organisationId: string,
  excludePricingId?: string
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("pricing_items")
    .select("id", { count: "exact", head: true })
    .eq("takeoff_item_id", takeoffItemId)
    .eq("organisation_id", organisationId);

  if (excludePricingId) {
    query = query.neq("id", excludePricingId);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}
