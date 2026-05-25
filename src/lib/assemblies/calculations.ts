import {
  calculateSellRate,
  normaliseMarkupMargin,
  roundMoney,
} from "@/src/lib/pricing/calculations";
import type { AssemblyPackageItem } from "@/src/types/database";

export type ComponentCostInput = {
  quantity_per_unit: number;
  wastage_percentage: number;
  cost_rate: number;
};

export function calculateComponentTotalCostPerUnit(
  input: ComponentCostInput
): number {
  const quantity = Math.max(0, input.quantity_per_unit);
  const wastage = Math.max(0, Math.min(100, input.wastage_percentage));
  const costRate = Math.max(0, input.cost_rate);
  const effectiveQuantity = quantity * (1 + wastage / 100);
  return roundMoney(effectiveQuantity * costRate);
}

export function sumComponentCostsPerUnit(
  items: Pick<AssemblyPackageItem, "total_cost_per_unit">[]
): number {
  return roundMoney(
    items.reduce((sum, item) => sum + item.total_cost_per_unit, 0)
  );
}

export type PackagePricingInput = {
  default_cost_rate: number;
  default_markup_percentage?: number | null;
  default_margin_percentage?: number | null;
};

export function calculatePackageSellRate(input: PackagePricingInput): {
  default_sell_rate: number;
  default_markup_percentage: number | null;
  default_margin_percentage: number | null;
} {
  const costRate = Math.max(0, input.default_cost_rate);
  const { markup_percentage, margin_percentage } = normaliseMarkupMargin(
    input.default_markup_percentage,
    input.default_margin_percentage
  );

  const default_sell_rate = calculateSellRate({
    cost_rate: costRate,
    markup_percentage,
    margin_percentage,
  });

  return {
    default_sell_rate,
    default_markup_percentage: markup_percentage,
    default_margin_percentage: margin_percentage,
  };
}

export function calculatePackageSummary(
  defaultCostRate: number,
  defaultSellRate: number,
  componentCount: number
): {
  costPerUnit: number;
  sellPerUnit: number;
  grossProfitPerUnit: number;
  marginPercent: number | null;
  componentCount: number;
} {
  const costPerUnit = roundMoney(defaultCostRate);
  const sellPerUnit = roundMoney(defaultSellRate);
  const grossProfitPerUnit = roundMoney(sellPerUnit - costPerUnit);
  const marginPercent =
    sellPerUnit > 0
      ? roundMoney((grossProfitPerUnit / sellPerUnit) * 100)
      : null;

  return {
    costPerUnit,
    sellPerUnit,
    grossProfitPerUnit,
    marginPercent,
    componentCount,
  };
}
