import { isAiReviewStatus } from "@/src/lib/ai-review/constants";
import type { AiReviewItem, AiReviewItemStatus } from "@/src/types/database";

function normalizeAiReviewStatus(raw: unknown): AiReviewItemStatus {
  const value = String(raw ?? "pending").trim().toLowerCase();

  if (isAiReviewStatus(value)) {
    return value;
  }

  switch (value) {
    case "approved":
    case "accept":
    case "accepted":
      return "accepted";
    case "reject":
    case "rejected":
      return "rejected";
    case "needs adjustment":
    case "needs_adjustment":
    case "adjusted":
      return "adjusted";
    case "pending":
    case "draft":
    default:
      return "pending";
  }
}

export function mapAiReviewItemRow(row: Record<string, unknown>): AiReviewItem {
  const status = normalizeAiReviewStatus(row.status);

  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    status,
    confidence:
      row.confidence === null || row.confidence === undefined
        ? null
        : Number(row.confidence),
    trade: String(row.trade ?? "General"),
    description: String(row.description ?? ""),
    quantity: Number(row.quantity ?? 0),
    unit: String(row.unit ?? "each"),
    reasoning: row.reasoning != null ? String(row.reasoning) : null,
    source_document_id:
      row.source_document_id != null ? String(row.source_document_id) : null,
    drawing_reference:
      row.drawing_reference != null ? String(row.drawing_reference) : null,
    sheet_number: row.sheet_number != null ? String(row.sheet_number) : null,
    page_number:
      row.page_number === null || row.page_number === undefined
        ? null
        : Number(row.page_number),
    overlay_geometry: row.overlay_geometry ?? null,
    result_takeoff_item_id:
      row.result_takeoff_item_id != null
        ? String(row.result_takeoff_item_id)
        : null,
    accepted_by: row.accepted_by != null ? String(row.accepted_by) : null,
    accepted_at: row.accepted_at != null ? String(row.accepted_at) : null,
    review_notes: row.review_notes != null ? String(row.review_notes) : null,
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}
