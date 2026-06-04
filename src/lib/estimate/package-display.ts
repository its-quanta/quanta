import { formatCurrency } from "@/src/lib/format";
import type {
  AssemblyPackage,
  PricingItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type PackageColumnKind =
  | "applied"
  | "none"
  | "manual"
  | "quote"
  | "allowance";

export type PackageColumnDisplay = {
  kind: PackageColumnKind;
  label: string;
  rateLabel: string | null;
  packageName: string | null;
};

export function getPackageColumnDisplay(input: {
  assembly: TakeoffItemAssemblyWithPackage | null | undefined;
  appliedPackage: AssemblyPackage | null | undefined;
  pricing: PricingItem | null | undefined;
}): PackageColumnDisplay {
  const { assembly, appliedPackage, pricing } = input;

  if (assembly) {
    const name =
      appliedPackage?.name ?? assembly.assembly_package.name ?? "Package";
    const unit = assembly.unit ?? appliedPackage?.unit ?? "each";
    const costRate =
      appliedPackage?.default_cost_rate ??
      (assembly.quantity > 0
        ? assembly.calculated_cost / assembly.quantity
        : null);

    return {
      kind: "applied",
      label: name,
      packageName: name,
      rateLabel:
        costRate != null && costRate > 0
          ? `${formatCurrency(costRate)}/${unit}`
          : null,
    };
  }

  if (pricing?.pricing_method === "subcontractor_quote") {
    return { kind: "quote", label: "Quote", packageName: null, rateLabel: null };
  }

  if (pricing?.pricing_method === "allowance") {
    return {
      kind: "allowance",
      label: "Allowance",
      packageName: null,
      rateLabel: null,
    };
  }

  if (pricing) {
    return { kind: "manual", label: "Manual", packageName: null, rateLabel: null };
  }

  return { kind: "none", label: "No package", packageName: null, rateLabel: null };
}

export function formatComponentsSummary(
  materialCount: number,
  labourCount: number
): string {
  const parts: string[] = [];
  if (materialCount > 0) {
    parts.push(
      `${materialCount} material${materialCount === 1 ? "" : "s"}`
    );
  }
  if (labourCount > 0) {
    parts.push(`${labourCount} labour`);
  }
  return parts.length > 0 ? parts.join(" · ") : "No components generated";
}
