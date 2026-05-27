import type { AiReviewItemStatus } from "@/src/types/database";

import { parseOverlayGeometry, type AiReviewOverlayGeometry } from "@/src/lib/ai-review/overlay";

export type AiReviewSegment = {
  id: string;
  organisation_id: string;
  project_id: string;
  ai_review_item_id: string;
  segment_key: string;
  trade: string;
  geometry: AiReviewOverlayGeometry | null;
  confidence: number | null;
  status: AiReviewItemStatus;
  label: string | null;
  created_at: string;
  updated_at: string;
};

export const AI_REVIEW_SEGMENT_COLUMNS =
  "id, organisation_id, project_id, ai_review_item_id, segment_key, trade, geometry, confidence, status, label, created_at, updated_at" as const;

export function mapAiReviewSegmentRow(
  row: Record<string, unknown>
): AiReviewSegment {
  const statusRaw = String(row.status ?? "pending");
  const status = (
    ["pending", "accepted", "rejected", "adjusted"] as const
  ).includes(statusRaw as AiReviewItemStatus)
    ? (statusRaw as AiReviewItemStatus)
    : "pending";

  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    ai_review_item_id: String(row.ai_review_item_id),
    segment_key: String(row.segment_key),
    trade: String(row.trade ?? "General"),
    geometry: parseOverlayGeometry(row.geometry),
    confidence:
      row.confidence === null || row.confidence === undefined
        ? null
        : Number(row.confidence),
    status,
    label: row.label != null ? String(row.label) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
