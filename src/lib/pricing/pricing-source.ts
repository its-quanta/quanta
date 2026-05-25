import type { PricingMethod, TakeoffItemAssemblyWithPackage } from "@/src/types/database";

import { formatPricingMethodLabel } from "@/src/lib/pricing/constants";

export function formatPricingSourceShort(
  pricingMethod: PricingMethod | undefined,
  appliedAssembly: TakeoffItemAssemblyWithPackage | undefined
): "Manual" | "Package" | "—" {
  if (pricingMethod === "package" || appliedAssembly) {
    return "Package";
  }

  if (pricingMethod) {
    return "Manual";
  }

  return "—";
}

export function formatPricingSourceLabel(
  pricingMethod: PricingMethod | undefined,
  appliedAssembly: TakeoffItemAssemblyWithPackage | undefined
): string {
  const short = formatPricingSourceShort(pricingMethod, appliedAssembly);

  if (short === "Package") {
    return appliedAssembly
      ? `Package · ${appliedAssembly.assembly_package.name}`
      : "Package";
  }

  if (short === "Manual" && pricingMethod) {
    return `Manual · ${formatPricingMethodLabel(pricingMethod)}`;
  }

  return "—";
}
