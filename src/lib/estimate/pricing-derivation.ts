import {
  calculatePricingTotals,
  computeAverageMarginPercent,
  roundMoney,
} from "@/src/lib/pricing/calculations";
import type {
  AssemblyPackage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type EstimatePricingMode =
  | "package"
  | "manual"
  | "quote"
  | "allowance"
  | "empty";

export type EstimatePricingModeOverride = "manual" | "quote" | "allowance";

export function resolveEstimatePricingMode(
  assembly: TakeoffItemAssemblyWithPackage | null,
  pricing: PricingItem | null,
  override: EstimatePricingModeOverride | null
): EstimatePricingMode {
  if (override === "manual") {
    return "manual";
  }
  if (override === "quote") {
    return "quote";
  }
  if (override === "allowance") {
    return "allowance";
  }

  if (pricing?.pricing_method === "subcontractor_quote") {
    return "quote";
  }
  if (pricing?.pricing_method === "allowance") {
    return "allowance";
  }
  if (pricing?.pricing_method === "package" || assembly) {
    return "package";
  }
  if (pricing?.pricing_method === "custom") {
    return "manual";
  }

  return "empty";
}

export function derivePackageCostRate(input: {
  takeoffItem: TakeoffItem;
  assembly: TakeoffItemAssemblyWithPackage | null;
  appliedPackage: AssemblyPackage | null;
  pricing: PricingItem | null;
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
}): number {
  const quantity = Math.max(0, input.takeoffItem.quantity);

  const materialTotal = input.materialItems
    .filter((row) => row.takeoff_item_id === input.takeoffItem.id)
    .reduce((sum, row) => sum + row.total_cost, 0);

  const labourTotal = input.labourItems
    .filter((row) => row.takeoff_item_id === input.takeoffItem.id)
    .reduce((sum, row) => sum + row.total_cost, 0);

  const generatedTotal = materialTotal + labourTotal;

  if (quantity > 0 && generatedTotal > 0) {
    return roundMoney(generatedTotal / quantity);
  }

  if (input.appliedPackage?.default_cost_rate != null) {
    return input.appliedPackage.default_cost_rate;
  }

  if (input.pricing?.cost_rate != null && input.pricing.cost_rate > 0) {
    return input.pricing.cost_rate;
  }

  if (input.assembly && input.assembly.quantity > 0) {
    return roundMoney(input.assembly.calculated_cost / input.assembly.quantity);
  }

  return 0;
}

export function deriveDefaultSellRate(input: {
  pricing: PricingItem | null;
  appliedPackage: AssemblyPackage | null;
}): number | null {
  if (input.pricing?.sell_rate != null && input.pricing.sell_rate > 0) {
    return input.pricing.sell_rate;
  }
  if (
    input.appliedPackage?.default_sell_rate != null &&
    input.appliedPackage.default_sell_rate > 0
  ) {
    return input.appliedPackage.default_sell_rate;
  }
  return null;
}

export function pricingMethodForMode(
  mode: EstimatePricingMode
): PricingItem["pricing_method"] | null {
  switch (mode) {
    case "package":
      return "package";
    case "manual":
      return "custom";
    case "quote":
      return "subcontractor_quote";
    case "allowance":
      return "allowance";
    default:
      return null;
  }
}

export function methodLabelForMode(mode: EstimatePricingMode): string {
  switch (mode) {
    case "package":
      return "Package";
    case "manual":
      return "Manual";
    case "quote":
      return "Subcontractor quote";
    case "allowance":
      return "Allowance";
    default:
      return "—";
  }
}

export type PricingFormNumbers = {
  quantity: number;
  unit: string;
  cost_rate: number;
  sell_rate: number;
  sell_rate_overridden: boolean;
  total_cost: number;
  total_sell: number;
  gross_profit: number;
  margin_percentage: number | null;
};

export function buildPricingFormNumbers(input: {
  quantity: number;
  cost_rate: number;
  sell_rate: number;
  sell_rate_overridden: boolean;
  total_cost?: number;
  total_sell?: number;
  lastEdited?: "cost_rate" | "sell_rate" | "total_cost" | "total_sell" | null;
}): PricingFormNumbers {
  const quantity = Math.max(0, input.quantity);
  let costRate = Math.max(0, input.cost_rate);
  let sellRate = Math.max(0, input.sell_rate);
  let sellOverridden = input.sell_rate_overridden;

  if (input.lastEdited === "total_cost" && input.total_cost !== undefined) {
    costRate = quantity > 0 ? roundMoney(input.total_cost / quantity) : 0;
  }

  if (input.lastEdited === "total_sell" && input.total_sell !== undefined) {
    sellRate = quantity > 0 ? roundMoney(input.total_sell / quantity) : 0;
    sellOverridden = true;
  }

  const totals = calculatePricingTotals({
    quantity,
    cost_rate: costRate,
    sell_rate: sellRate,
    sell_rate_overridden: sellOverridden,
  });

  if (input.lastEdited === "total_cost" && input.total_cost !== undefined) {
    return {
      quantity,
      unit: "",
      cost_rate: costRate,
      sell_rate: totals.sell_rate,
      sell_rate_overridden: sellOverridden,
      total_cost: roundMoney(input.total_cost),
      total_sell: totals.total_sell,
      gross_profit: roundMoney(totals.total_sell - roundMoney(input.total_cost)),
      margin_percentage: computeAverageMarginPercent(
        totals.total_sell,
        totals.total_sell - roundMoney(input.total_cost)
      ),
    };
  }

  if (input.lastEdited === "total_sell" && input.total_sell !== undefined) {
    const totalSell = roundMoney(input.total_sell);
    const totalCost = totals.total_cost;
    return {
      quantity,
      unit: "",
      cost_rate: costRate,
      sell_rate: sellRate,
      sell_rate_overridden: true,
      total_cost: totalCost,
      total_sell: totalSell,
      gross_profit: roundMoney(totalSell - totalCost),
      margin_percentage: computeAverageMarginPercent(
        totalSell,
        totalSell - totalCost
      ),
    };
  }

  return {
    quantity,
    unit: "",
    cost_rate: costRate,
    sell_rate: totals.sell_rate,
    sell_rate_overridden: sellOverridden,
    total_cost: totals.total_cost,
    total_sell: totals.total_sell,
    gross_profit: totals.gross_profit,
    margin_percentage: computeAverageMarginPercent(
      totals.total_sell,
      totals.gross_profit
    ),
  };
}
