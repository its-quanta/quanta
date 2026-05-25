import type { PricingMethod } from "@/src/types/database";

export const PRICING_METHODS: readonly {
  value: PricingMethod;
  label: string;
}[] = [
  { value: "m2", label: "m²" },
  { value: "sqm", label: "sqm" },
  { value: "lm", label: "lm" },
  { value: "m3", label: "m³" },
  { value: "each", label: "each" },
  { value: "item", label: "item" },
  { value: "hour", label: "hour" },
  { value: "day", label: "day" },
  { value: "allowance", label: "allowance" },
  { value: "package", label: "package" },
  { value: "subcontractor_quote", label: "subcontractor quote" },
  { value: "custom", label: "custom" },
] as const;

const PRICING_METHOD_SET = new Set<PricingMethod>(
  PRICING_METHODS.map((m) => m.value)
);

export function isPricingMethod(value: string): value is PricingMethod {
  return PRICING_METHOD_SET.has(value as PricingMethod);
}

export function formatPricingMethodLabel(method: PricingMethod): string {
  return PRICING_METHODS.find((m) => m.value === method)?.label ?? method;
}
