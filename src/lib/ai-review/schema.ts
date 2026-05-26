import { isAiReviewStatus } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

export function mapAiReviewItemRow(row: Record<string, unknown>): AiReviewItem {
  const statusRaw = String(row.status ?? "pending");
  const status = isAiReviewStatus(statusRaw) ? statusRaw : "pending";

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
