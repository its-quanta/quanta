export const RATE_UNITS = [
  "hour",
  "day",
  "each",
  "item",
  "lm",
  "m²",
  "sqm",
  "m³",
  "allowance",
  "package",
] as const;

export const MATERIAL_CATEGORIES = [
  "Timber",
  "Steel",
  "Fixings",
  "Insulation",
  "Finishes",
  "Services",
  "Other",
] as const;

export const SUBCONTRACTOR_RATE_BASIS = [
  { value: "m²", label: "per m²" },
  { value: "lm", label: "per lm" },
  { value: "hour", label: "per hour" },
  { value: "day", label: "per day" },
  { value: "item", label: "per item" },
  { value: "lump_sum", label: "lump sum" },
  { value: "allowance", label: "allowance" },
] as const;

/** Supplier rates older than this are flagged as outdated. */
export const OUTDATED_SUPPLIER_RATE_DAYS = 90;

/** Recent changes window for the rate dashboard. */
export const RECENT_RATE_CHANGE_DAYS = 7;
