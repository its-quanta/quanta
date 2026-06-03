/** MVP limits for a single Gemini analysis batch. */
export const MAX_ANALYSIS_BATCH_BYTES = 25 * 1024 * 1024;
export const MAX_ANALYSIS_BATCH_PAGES = 10;

export const SUPPORTED_ANALYSIS_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpg",
  "image/jpeg",
] as const;

export type DocumentPageType =
  | "demolition"
  | "floor_plan"
  | "partition"
  | "ceiling"
  | "schedule"
  | "specification"
  | "other";

export const DOCUMENT_PAGE_TYPE_LABELS: Record<DocumentPageType, string> = {
  demolition: "Demolition",
  floor_plan: "Floor plan",
  partition: "Partition",
  ceiling: "Ceiling",
  schedule: "Schedule",
  specification: "Specification",
  other: "Other",
};

export const LARGE_PDF_FULL_FILE_WARNING =
  "This file is too large to analyse in full. Select specific pages to analyse.";

/** @deprecated Use LARGE_PDF_FULL_FILE_WARNING */
export const LARGE_PDF_GUIDANCE = LARGE_PDF_FULL_FILE_WARNING;
