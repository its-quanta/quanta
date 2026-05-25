/**
 * Pricing Engine v1 calculations.
 *
 * Markup vs margin: they are not interchangeable.
 * - Markup % is applied on cost: sell_rate = cost_rate × (1 + markup / 100)
 * - Margin % is applied on sell: sell_rate = cost_rate / (1 − margin / 100)
 *
 * When both markup and margin are supplied, margin takes priority and markup is
 * cleared on save (see normaliseMarkupMargin in actions).
 */

export type PricingCalculationInput = {
  quantity: number;
  cost_rate: number;
  markup_percentage?: number | null;
  margin_percentage?: number | null;
  sell_rate?: number | null;
  sell_rate_overridden?: boolean;
};

export type PricingCalculationResult = {
  total_cost: number;
  sell_rate: number;
  total_sell: number;
  gross_profit: number;
  markup_percentage: number | null;
  margin_percentage: number | null;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function hasMarkupValue(markup: number | null | undefined): boolean {
  return markup !== null && markup !== undefined && markup > 0;
}

export function hasMarginValue(margin: number | null | undefined): boolean {
  return margin !== null && margin !== undefined && margin > 0;
}

/**
 * Prefer margin when both are present (margin takes priority).
 */
export function normaliseMarkupMargin(
  markup: number | null | undefined,
  margin: number | null | undefined
): { markup_percentage: number | null; margin_percentage: number | null } {
  if (hasMarginValue(margin)) {
    return { markup_percentage: null, margin_percentage: margin ?? null };
  }

  if (hasMarkupValue(markup)) {
    return { markup_percentage: markup ?? null, margin_percentage: null };
  }

  return {
    markup_percentage: markup ?? null,
    margin_percentage: margin ?? null,
  };
}

export function calculateSellRate(input: {
  cost_rate: number;
  markup_percentage?: number | null;
  margin_percentage?: number | null;
  sell_rate?: number | null;
  sell_rate_overridden?: boolean;
}): number {
  if (input.sell_rate_overridden && input.sell_rate !== null && input.sell_rate !== undefined) {
    return input.sell_rate;
  }

  const costRate = input.cost_rate;

  if (hasMarginValue(input.margin_percentage)) {
    const margin = input.margin_percentage!;
    if (margin >= 100) {
      return costRate;
    }
    return roundMoney(costRate / (1 - margin / 100));
  }

  if (hasMarkupValue(input.markup_percentage)) {
    return roundMoney(costRate * (1 + input.markup_percentage! / 100));
  }

  if (input.sell_rate !== null && input.sell_rate !== undefined) {
    return input.sell_rate;
  }

  return costRate;
}

export function calculatePricingTotals(
  input: PricingCalculationInput
): PricingCalculationResult {
  const quantity = Math.max(0, input.quantity);
  const costRate = Math.max(0, input.cost_rate);
  const { markup_percentage, margin_percentage } = normaliseMarkupMargin(
    input.markup_percentage,
    input.margin_percentage
  );

  const total_cost = roundMoney(quantity * costRate);
  const sell_rate = calculateSellRate({
    cost_rate: costRate,
    markup_percentage,
    margin_percentage,
    sell_rate: input.sell_rate,
    sell_rate_overridden: input.sell_rate_overridden,
  });
  const total_sell = roundMoney(quantity * sell_rate);
  const gross_profit = roundMoney(total_sell - total_cost);

  return {
    total_cost,
    sell_rate,
    total_sell,
    gross_profit,
    markup_percentage,
    margin_percentage,
  };
}

export function computeAverageMarginPercent(
  totalSell: number,
  grossProfit: number
): number | null {
  if (totalSell <= 0) {
    return null;
  }

  return roundMoney((grossProfit / totalSell) * 100);
}

export function computePricingCompletionPercent(
  pricedTakeoffCount: number,
  priceableTakeoffCount: number
): number | null {
  if (priceableTakeoffCount <= 0) {
    return null;
  }

  return roundMoney((pricedTakeoffCount / priceableTakeoffCount) * 100);
}
