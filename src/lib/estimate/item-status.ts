import type { PricingItem, TakeoffItem, TakeoffItemAssemblyWithPackage } from "@/src/types/database";

export type EstimateItemStatus =
  | "no_package"
  | "no_sell_price"
  | "inverted"
  | "quote"
  | "allowance"
  | "manual_unsaved"
  | "ready";

export function deriveItemStatus(
  item: TakeoffItem,
  assembly: TakeoffItemAssemblyWithPackage | undefined,
  pricing: PricingItem | undefined
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

  const hasSell =
    pricing !== undefined &&
    pricing.sell_rate > 0 &&
    pricing.total_sell > 0;

  if (pricing?.pricing_method === "custom" && !hasSell) {
    return "manual_unsaved";
  }

  if (assembly && pricing && hasSell) {
    if (pricing.total_sell < pricing.total_cost) {
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
  pricing: PricingItem | undefined
): number | null {
  if (!pricing?.total_sell || pricing.total_sell <= 0) {
    return null;
  }
  return ((pricing.total_sell - pricing.total_cost) / pricing.total_sell) * 100;
}
