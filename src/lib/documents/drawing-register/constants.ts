import type { DocumentPageType } from "@/src/types/database";

export const DRAWING_REGISTER_PAGE_TYPES: DocumentPageType[] = [
  "demolition",
  "floor_plan",
  "partition",
  "ceiling",
  "schedule",
  "specification",
  "other",
];

export const DRAWING_REGISTER_TYPE_LABELS: Record<DocumentPageType, string> = {
  demolition: "Demolition",
  floor_plan: "Floor plan",
  partition: "Partition",
  ceiling: "Ceiling",
  schedule: "Schedule",
  specification: "Specification",
  other: "Other",
};

export type DrawingRegisterQuickFilter =
  | "all"
  | "demolition"
  | "floor_plans"
  | "partitions"
  | "ceilings"
  | "schedules"
  | "specifications";

export const DRAWING_REGISTER_QUICK_FILTERS: {
  id: DrawingRegisterQuickFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "demolition", label: "Demolition" },
  { id: "floor_plans", label: "Floor plans" },
  { id: "partitions", label: "Partitions" },
  { id: "ceilings", label: "Ceilings" },
  { id: "schedules", label: "Schedules" },
  { id: "specifications", label: "Specifications" },
];

const FILTER_PAGE_TYPES: Record<
  Exclude<DrawingRegisterQuickFilter, "all">,
  DocumentPageType
> = {
  demolition: "demolition",
  floor_plans: "floor_plan",
  partitions: "partition",
  ceilings: "ceiling",
  schedules: "schedule",
  specifications: "specification",
};

export function matchesDrawingRegisterFilter(
  pageType: DocumentPageType | null | undefined,
  filter: DrawingRegisterQuickFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return pageType === FILTER_PAGE_TYPES[filter];
}
