import type { StandardLinkEntityType, StandardType } from "@/src/types/database";

export const STANDARD_TYPES: readonly {
  value: StandardType;
  label: string;
}[] = [
  { value: "nz_standard", label: "NZ standard" },
  { value: "building_code", label: "Building code" },
  { value: "specification", label: "Specification" },
  { value: "manufacturer_guide", label: "Manufacturer guide" },
  { value: "drawing", label: "Drawing" },
  { value: "custom", label: "Custom" },
] as const;

export const STANDARD_LINK_ENTITY_LABELS: Record<
  StandardLinkEntityType,
  string
> = {
  takeoff_item: "Takeoff item",
  assembly_package: "Assembly package",
  pricing_item: "Pricing item",
};

export const STANDARD_TRADES = [
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

export const STANDARD_JURISDICTIONS = [
  "New Zealand",
  "Australia",
  "United Kingdom",
  "Other",
] as const;
