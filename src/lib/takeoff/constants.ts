import type { TakeoffItemStatus } from "@/src/types/database";

export const TAKEOFF_UNITS = [
  "m2",
  "sqm",
  "lm",
  "m3",
  "m",
  "each",
  "item",
  "hour",
  "day",
  "kg",
  "tonne",
  "allowance",
  "package",
  "custom",
] as const;

export type TakeoffUnit = (typeof TAKEOFF_UNITS)[number];

export const TAKEOFF_TRADES = [
  "Carpentry",
  "Demolition",
  "Deconstruction",
  "Partitions",
  "Ceilings",
  "Flooring",
  "Painting",
  "Joinery",
  "Glazing",
  "Furniture",
  "Labour",
  "Electrical",
  "Plumbing",
  "Fire",
  "Mechanical",
  "General",
  "Other",
] as const;

export type TakeoffTrade = (typeof TAKEOFF_TRADES)[number];

/** Status options for manual takeoff entry and editing. */
export const MANUAL_TAKEOFF_STATUSES: {
  value: TakeoffItemStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "needs_review", label: "Needs review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "priced", label: "Priced" },
  { value: "excluded", label: "Excluded" },
];

export const TAKEOFF_STATUSES: {
  value: TakeoffItemStatus;
  label: string;
}[] = [
  ...MANUAL_TAKEOFF_STATUSES,
  { value: "ai_draft", label: "AI draft" },
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
  "draft",
  "ai_draft",
  "needs_review",
]);

export const TAKEOFF_ITEM_COLUMNS =
  "id, organisation_id, project_id, source_document_id, document_page_id, trade, item_name, description, quantity, unit, drawing_reference, page_number, sheet_number, detail_reference, specification_reference, confidence_score, ai_generated, reviewed, status, notes, sort_order, created_at, updated_at" as const;

export const selectClassName =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export const cellInputClassName =
  "h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition-colors hover:border-input hover:bg-input/10 focus-visible:border-ring focus-visible:bg-input/20 focus-visible:ring-2 focus-visible:ring-ring/30";

export const cellNumberClassName = `${cellInputClassName} font-mono tabular-nums text-right`;

export function isTakeoffUnit(value: string): value is TakeoffUnit {
  return (TAKEOFF_UNITS as readonly string[]).includes(value);
}

export function isTakeoffStatus(value: string): value is TakeoffItemStatus {
  return TAKEOFF_STATUSES.some((item) => item.value === value);
}

export function isManualTakeoffStatus(value: string): boolean {
  return MANUAL_TAKEOFF_STATUSES.some((item) => item.value === value);
}

export function resolveTradeValue(trade: string, customTrade: string): string {
  if (trade === "Other") {
    return customTrade.trim() || "Other";
  }
  return trade.trim() || "General";
}

export function computeTakeoffTotals(items: {
  reviewed: boolean;
  status: TakeoffItemStatus;
}[]) {
  const totalItems = items.length;
  const reviewedItems = items.filter(
    (item) => item.reviewed || REVIEWED_STATUSES.has(item.status)
  ).length;
  const outstandingItems = items.filter(
    (item) =>
      item.status !== "excluded" &&
      item.status !== "priced" &&
      !item.reviewed &&
      OUTSTANDING_STATUSES.has(item.status)
  ).length;
  const pricedItems = items.filter((item) => item.status === "priced").length;
  const excludedItems = items.filter(
    (item) => item.status === "excluded"
  ).length;

  return {
    totalItems,
    reviewedItems,
    outstandingItems,
    pricedItems,
    excludedItems,
  };
}
