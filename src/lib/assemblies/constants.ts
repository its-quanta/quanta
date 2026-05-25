import type { AssemblyPackageItemType } from "@/src/types/database";

export const ASSEMBLY_ITEM_TYPES: readonly {
  value: AssemblyPackageItemType;
  label: string;
}[] = [
  { value: "material", label: "Material" },
  { value: "labour", label: "Labour" },
  { value: "plant", label: "Plant" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "allowance", label: "Allowance" },
] as const;

const ITEM_TYPE_SET = new Set<string>(
  ASSEMBLY_ITEM_TYPES.map((t) => t.value)
);

export function isAssemblyItemType(
  value: string
): value is AssemblyPackageItemType {
  return ITEM_TYPE_SET.has(value);
}

export const ASSEMBLY_UNITS = [
  "m2",
  "sqm",
  "lm",
  "m",
  "m3",
  "each",
  "item",
  "hour",
  "hr",
  "day",
  "allowance",
  "lump_sum",
] as const;

export const ASSEMBLY_TRADES = [
  "General",
  "Carpentry",
  "Ceilings",
  "Drywall",
  "Joinery",
  "Flooring",
  "Painting",
  "Electrical",
  "Plumbing",
  "Structural",
  "Other",
] as const;
