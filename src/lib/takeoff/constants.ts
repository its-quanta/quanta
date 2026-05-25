import type { TakeoffItemStatus } from "@/src/types/database";

export const TAKEOFF_UNITS = [
  "sqm",
  "lm",
  "m3",
  "m2",
  "m",
  "kg",
  "tonne",
  "hour",
  "day",
  "each",
  "allowance",
  "item",
  "custom",
] as const;

export type TakeoffUnit = (typeof TAKEOFF_UNITS)[number];

export const TAKEOFF_TRADES = [
  "Carpentry",
  "Demolition",
  "Partitions",
  "Ceilings",
  "Flooring",
  "Painting",
  "Joinery",
  "Furniture",
  "Labour",
  "Electrical",
  "Plumbing",
  "Fire",
  "Glazing",
  "General",
] as const;

export type TakeoffTrade = (typeof TAKEOFF_TRADES)[number];

export const TAKEOFF_STATUSES: {
  value: TakeoffItemStatus;
  label: string;
}[] = [
  { value: "ai_draft", label: "AI Draft" },
  { value: "needs_review", label: "Needs Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "priced", label: "Priced" },
  { value: "excluded", label: "Excluded" },
];

export const TAKEOFF_STATUS_LABELS: Record<TakeoffItemStatus, string> =
  Object.fromEntries(
    TAKEOFF_STATUSES.map((item) => [item.value, item.label])
  ) as Record<TakeoffItemStatus, string>;

export const REVIEWED_STATUSES = new Set<TakeoffItemStatus>([
  "reviewed",
  "priced",
]);

export const OUTSTANDING_STATUSES = new Set<TakeoffItemStatus>([
  "ai_draft",
  "needs_review",
]);

export const TAKEOFF_ITEM_COLUMNS =
  "id, organisation_id, project_id, source_document_id, trade, item_name, description, quantity, unit, drawing_reference, page_number, confidence_score, ai_generated, reviewed, status, notes, sort_order, created_at, updated_at" as const;

export const selectClassName =
  "h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

export const cellInputClassName =
  "h-7 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition-colors hover:border-input hover:bg-input/10 focus-visible:border-ring focus-visible:bg-input/20 focus-visible:ring-2 focus-visible:ring-ring/30";

export const cellNumberClassName = `${cellInputClassName} font-mono tabular-nums text-right`;

export function isTakeoffUnit(value: string): value is TakeoffUnit {
  return (TAKEOFF_UNITS as readonly string[]).includes(value);
}

export function isTakeoffStatus(value: string): value is TakeoffItemStatus {
  return TAKEOFF_STATUSES.some((item) => item.value === value);
}

export function computeTakeoffTotals(items: {
  reviewed: boolean;
  status: TakeoffItemStatus;
}[]) {
  const totalItems = items.length;
  const itemsReviewed = items.filter(
    (item) => item.reviewed || REVIEWED_STATUSES.has(item.status)
  ).length;
  const itemsOutstanding = items.filter(
    (item) =>
      !item.reviewed &&
      OUTSTANDING_STATUSES.has(item.status) &&
      item.status !== "excluded"
  ).length;

  return { totalItems, itemsReviewed, itemsOutstanding };
}
