import type {
  AiReviewItem,
  AiReviewItemStatus,
  AiReviewConfidenceLevel,
} from "@/src/types/database";

export const AI_REVIEW_STATUSES: AiReviewItemStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "adjusted",
];

export const AI_REVIEW_STATUS_LABELS: Record<AiReviewItemStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  adjusted: "Adjusted",
};

export const AI_REVIEW_COLUMNS_CORE =
  "id, organisation_id, project_id, status, confidence, trade, description, quantity, unit, reasoning, source_document_id, drawing_reference, sheet_number, page_number, created_at" as const;

export const AI_REVIEW_COLUMNS_BASE =
  `${AI_REVIEW_COLUMNS_CORE}, result_takeoff_item_id, accepted_by, accepted_at, review_notes, updated_at` as const;

/** Includes optional visual-layer column when deployed. */
export const AI_REVIEW_COLUMNS =
  `${AI_REVIEW_COLUMNS_BASE}, overlay_geometry` as const;

export const AI_REVIEW_COLUMN_SELECT_ATTEMPTS = [
  AI_REVIEW_COLUMNS_CORE,
  AI_REVIEW_COLUMNS_BASE,
  AI_REVIEW_COLUMNS,
] as const;

export function isAiReviewStatus(value: string): value is AiReviewItemStatus {
  return (AI_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function resolveConfidenceLevel(
  confidence: number | null
): AiReviewConfidenceLevel | null {
  if (confidence === null || confidence === undefined) {
    return null;
  }

  const percent = confidence <= 1 ? confidence * 100 : confidence;

  if (percent >= 95) {
    return "high";
  }
  if (percent >= 80) {
    return "medium";
  }
  return "low";
}

export function confidenceToPercent(confidence: number | null): number | null {
  if (confidence === null || confidence === undefined) {
    return null;
  }
  return confidence <= 1 ? confidence * 100 : confidence;
}

export function isConfidenceAtLeast(
  confidence: number | null,
  thresholdPercent: number
): boolean {
  const percent = confidenceToPercent(confidence);
  return percent !== null && percent >= thresholdPercent;
}

export function matchesConfidenceFilter(
  item: AiReviewItem,
  filter: "high" | "medium" | "low" | null
): boolean {
  if (!filter) {
    return true;
  }
  const level = resolveConfidenceLevel(item.confidence);
  if (filter === "high") {
    return level === "high";
  }
  return filter === "medium" ? level === "medium" : level === "low";
}

export function formatConfidencePercent(confidence: number | null): string {
  if (confidence === null || confidence === undefined) {
    return "—";
  }

  const percent = confidenceToPercent(confidence);
  if (percent === null) {
    return "—";
  }
  return `${Math.round(percent)}%`;
}
