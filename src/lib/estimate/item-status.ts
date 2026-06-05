import type { PricingItem, TakeoffItem, TakeoffItemAssemblyWithPackage } from "@/src/types/database";

export type EstimateItemStatus =
  | "no_package"
  | "no_sell_price"
  | "inverted"
  | "quote"
  | "allowance"
  | "manual_unsaved"
  | "ready";

export type ItemStatusPricingTotals = {
  totalCost: number;
  totalSell: number;
  sellRate: number;
};

export function deriveItemStatus(
  item: TakeoffItem,
  assembly: TakeoffItemAssemblyWithPackage | undefined,
  pricing: PricingItem | undefined,
  calculated?: ItemStatusPricingTotals
): EstimateItemStatus {
  if (!assembly && !pricing) {
    return "no_package";
  }

  if (pricing?.pricing_method === "subcontractor_quote") {
    return "quote";
  }

  if (pricing?.pricing_method === "allowance") {
    return "allowance";
  }

  const sellRate = calculated?.sellRate ?? pricing?.sell_rate ?? 0;
  const totalSell = calculated?.totalSell ?? pricing?.total_sell ?? 0;
  const totalCost = calculated?.totalCost ?? pricing?.total_cost ?? 0;

  const hasSell = pricing !== undefined && sellRate > 0 && totalSell > 0;

  if (pricing?.pricing_method === "custom" && !hasSell) {
    return "manual_unsaved";
  }

  if (assembly && pricing && hasSell) {
    if (totalSell < totalCost) {
      return "inverted";
    }
    return "ready";
  }

  if (assembly && !hasSell) {
    return "no_sell_price";
  }

  if (hasSell) {
    return "ready";
  }

  return "no_package";
}

export function deriveRowMarginPercent(
  pricing: PricingItem | undefined,
  marginPercent?: number | null
): number | null {
  if (marginPercent !== undefined && marginPercent !== null) {
    return marginPercent;
  }
  if (!pricing?.total_sell || pricing.total_sell <= 0) {
    return null;
  }
  return ((pricing.total_sell - pricing.total_cost) / pricing.total_sell) * 100;
}
