import { computeAverageMarginPercent } from "@/src/lib/pricing/calculations";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type { TakeoffItem } from "@/src/types/database";

export type PricingSummaryTotals = {
  totalCost: number;
  totalSell: number;
  grossProfit: number;
  averageMarginPercent: number | null;
  unpricedCount: number;
};

export function getPricedTakeoffIds(pricingItems: PricingItemWithTakeoff[]): Set<string> {
  return new Set(pricingItems.map((item) => item.takeoff_item_id));
}

export function getUnpricedTakeoffItems(
  takeoffItems: TakeoffItem[],
  pricedTakeoffIds: Set<string>
): TakeoffItem[] {
  return takeoffItems.filter(
    (item) => item.status !== "excluded" && !pricedTakeoffIds.has(item.id)
  );
}

export function computePricingSummary(
  pricingItems: PricingItemWithTakeoff[],
  takeoffItems: TakeoffItem[]
): PricingSummaryTotals {
  const totalCost = pricingItems.reduce((sum, item) => sum + item.total_cost, 0);
  const totalSell = pricingItems.reduce((sum, item) => sum + item.total_sell, 0);
  const grossProfit = pricingItems.reduce((sum, item) => sum + item.gross_profit, 0);
  const pricedIds = getPricedTakeoffIds(pricingItems);
  const unpriced = getUnpricedTakeoffItems(takeoffItems, pricedIds);

  return {
    totalCost,
    totalSell,
    grossProfit,
    averageMarginPercent: computeAverageMarginPercent(totalSell, grossProfit),
    unpricedCount: unpriced.length,
  };
}
