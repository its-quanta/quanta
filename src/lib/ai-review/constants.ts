import type { AiReviewItemStatus, AiReviewConfidenceLevel } from "@/src/types/database";

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

export const AI_REVIEW_COLUMNS =
  "id, organisation_id, project_id, status, confidence, trade, description, quantity, unit, reasoning, source_document_id, drawing_reference, sheet_number, page_number, result_takeoff_item_id, accepted_by, accepted_at, review_notes, created_at, updated_at" as const;

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

export function formatConfidencePercent(confidence: number | null): string {
  if (confidence === null || confidence === undefined) {
    return "—";
  }

  const percent = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(percent)}%`;
}
