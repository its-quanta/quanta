export type AiReviewApprovalAction = "approve" | "reject" | "adjust" | "pending";

export type AiReviewApprovalEvent = {
  id: string;
  organisation_id: string;
  project_id: string;
  ai_review_item_id: string;
  ai_review_segment_id: string | null;
  action: AiReviewApprovalAction;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
};

export const AI_REVIEW_APPROVAL_EVENT_COLUMNS =
  "id, organisation_id, project_id, ai_review_item_id, ai_review_segment_id, action, notes, performed_by, created_at" as const;

export const AI_REVIEW_APPROVAL_ACTION_LABELS: Record<
  AiReviewApprovalAction,
  string
> = {
  approve: "Approved",
  reject: "Rejected",
  adjust: "Adjusted",
  pending: "Reset to pending",
};

export function mapAiReviewApprovalEventRow(
  row: Record<string, unknown>
): AiReviewApprovalEvent {
  const actionRaw = String(row.action ?? "pending");
  const action = (
    ["approve", "reject", "adjust", "pending"] as const
  ).includes(actionRaw as AiReviewApprovalAction)
    ? (actionRaw as AiReviewApprovalAction)
    : "pending";

  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    ai_review_item_id: String(row.ai_review_item_id),
    ai_review_segment_id:
      row.ai_review_segment_id != null
        ? String(row.ai_review_segment_id)
        : null,
    action,
    notes: row.notes != null ? String(row.notes) : null,
    performed_by:
      row.performed_by != null ? String(row.performed_by) : null,
    created_at: String(row.created_at),
  };
}
