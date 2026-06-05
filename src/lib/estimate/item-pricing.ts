import { computeBuildUpTotals } from "@/src/lib/estimate/build-up-totals";
import {
  deriveDefaultSellRate,
  resolveEstimatePricingMode,
} from "@/src/lib/estimate/pricing-derivation";
import {
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

export type CalculateEstimateItemPricingInput = {
  takeoffItem: TakeoffItem;
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  pricingItem: PricingItem | null;
  packageAssembly: TakeoffItemAssemblyWithPackage | null;
  appliedPackage: AssemblyPackage | null;
};

export type EstimateItemPricingResult = {
  materialsTotal: number;
  labourTotal: number;
  totalCost: number;
  costRate: number;
  sellRate: number;
  totalSell: number;
  grossProfit: number;
  marginPercent: number | null;
  /** When true, absolute totalCost comes from material/labour lines, not rate × qty. */
  costFromBuildUp: boolean;
};

/**
 * Shared pricing roll-up for estimate rows.
 *
 * Package/build-up items: material + labour line totals drive totalCost;
 * costRate = totalCost / quantity. sellRate stays user/package-entered;
 * totalSell = sellRate × quantity.
 *
 * Manual/quote/allowance without build-up: stored cost_rate × quantity drives totals.
 */
export function calculateEstimateItemPricing(
  input: CalculateEstimateItemPricingInput
): EstimateItemPricingResult {
  const quantity = Math.max(0, input.takeoffItem.quantity);

  const buildUp = computeBuildUpTotals({
    materialItems: input.materialItems,
    labourItems: input.labourItems,
    takeoffItemId: input.takeoffItem.id,
    quantity,
  });

  const materialsTotal = buildUp.materialsTotal;
  const labourTotal = buildUp.labourTotal;
  const buildUpTotalCost = buildUp.buildUpTotalCost;
  const hasBuildUpLines =
    buildUp.materialLines.length > 0 || buildUp.labourLines.length > 0;

  const mode = resolveEstimatePricingMode(
    input.packageAssembly,
    input.pricingItem,
    null
  );

  let costRate = 0;
  let totalCost = 0;
  let costFromBuildUp = false;

  if (mode === "package" && hasBuildUpLines && buildUpTotalCost > 0) {
    totalCost = buildUpTotalCost;
    costRate = quantity > 0 ? roundMoney(buildUpTotalCost / quantity) : 0;
    costFromBuildUp = true;
  } else if (input.pricingItem) {
    costRate = Math.max(0, input.pricingItem.cost_rate);
    totalCost = roundMoney(costRate * quantity);
  } else if (input.appliedPackage?.default_cost_rate != null) {
    costRate = input.appliedPackage.default_cost_rate;
    totalCost = roundMoney(costRate * quantity);
  } else if (
    input.packageAssembly &&
    input.packageAssembly.quantity > 0
  ) {
    costRate = roundMoney(
      input.packageAssembly.calculated_cost / input.packageAssembly.quantity
    );
    totalCost = roundMoney(costRate * quantity);
  } else if (mode === "package" && buildUpTotalCost > 0) {
    totalCost = buildUpTotalCost;
    costRate = quantity > 0 ? roundMoney(buildUpTotalCost / quantity) : 0;
    costFromBuildUp = true;
  }

  const defaultSell = deriveDefaultSellRate({
    pricing: input.pricingItem,
    appliedPackage: input.appliedPackage,
  });
  const sellRate = Math.max(
    0,
    input.pricingItem?.sell_rate ?? defaultSell ?? 0
  );
  const totalSell = sellRate > 0 ? roundMoney(sellRate * quantity) : 0;
  const grossProfit = roundMoney(totalSell - totalCost);
  const marginPercent =
    totalSell > 0
      ? computeAverageMarginPercent(totalSell, grossProfit)
      : null;

  return {
    materialsTotal,
    labourTotal,
    totalCost,
    costRate,
    sellRate,
    totalSell,
    grossProfit,
    marginPercent,
    costFromBuildUp,
  };
}

export function pricingTotalsNeedSync(
  calculated: EstimateItemPricingResult,
  pricing: PricingItem,
  quantity: number
): boolean {
  const costDrift =
    Math.abs(pricing.total_cost - calculated.totalCost) >= 0.005 ||
    Math.abs(pricing.cost_rate - calculated.costRate) >= 0.005;
  const qtyDrift = Math.abs(pricing.quantity - quantity) >= 0.005;
  const sellDrift =
    calculated.totalSell > 0 &&
    Math.abs(pricing.total_sell - calculated.totalSell) >= 0.005;

  return costDrift || qtyDrift || sellDrift;
}
