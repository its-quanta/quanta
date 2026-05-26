import type {
  ClarificationStatus,
  ClarificationTemplate,
  ClarificationTemplateType,
  ClarificationType,
  RfiPriority,
  TenderClarification,
} from "@/src/types/database";

/** Columns on public.tender_clarifications (live schema). */
export const CLARIFICATION_COLUMNS =
  "id, organisation_id, project_id, type, title, description, category, status, priority, related_drawing, related_takeoff_item_id, ai_generated, reviewed, created_at, updated_at";

const TEMPLATE_COLUMNS =
  "id, organisation_id, type, title, description, category, sort_order, is_active, created_at, updated_at";

export { TEMPLATE_COLUMNS };

const CLARIFICATION_TYPES: ClarificationType[] = [
  "exclusion",
  "assumption",
  "rfi",
  "clarification",
  "risk",
  "note",
];

function normalizeType(value: unknown): ClarificationType {
  const type = String(value ?? "");
  if (CLARIFICATION_TYPES.includes(type as ClarificationType)) {
    return type as ClarificationType;
  }
  return "clarification";
}

function normalizeStatus(value: unknown): ClarificationStatus {
  const status = String(value ?? "open");
  if (
    status === "draft" ||
    status === "open" ||
    status === "answered" ||
    status === "closed"
  ) {
    return status;
  }
  return "open";
}

function normalizePriority(value: unknown): RfiPriority | null {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return null;
}

function readRelatedDrawing(row: Record<string, unknown>): string | null {
  if (row.related_drawing != null && String(row.related_drawing).trim()) {
    return String(row.related_drawing);
  }
  if (
    row.related_drawing_reference != null &&
    String(row.related_drawing_reference).trim()
  ) {
    return String(row.related_drawing_reference);
  }
  return null;
}

function readRelatedTakeoffItemId(row: Record<string, unknown>): string | null {
  if (row.related_takeoff_item_id != null) {
    return String(row.related_takeoff_item_id);
  }
  if (row.takeoff_item_id != null) {
    return String(row.takeoff_item_id);
  }
  return null;
}

export function mapTenderClarificationRow(
  row: Record<string, unknown>
): TenderClarification {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    type: normalizeType(row.type),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    category: row.category != null ? String(row.category) : null,
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    related_drawing: readRelatedDrawing(row),
    related_takeoff_item_id: readRelatedTakeoffItemId(row),
    ai_generated: row.ai_generated === true,
    reviewed: row.reviewed === true,
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function mapClarificationTemplateRow(
  row: Record<string, unknown>
): ClarificationTemplate {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    type: row.type as ClarificationTemplateType,
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    category: row.category != null ? String(row.category) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function buildClarificationInsertRow(input: {
  organisationId: string;
  projectId: string;
  type: ClarificationType;
  title: string;
  description: string | null;
  category: string | null;
  status: ClarificationStatus;
  priority: RfiPriority | null;
  related_drawing: string | null;
  related_takeoff_item_id: string | null;
}): Record<string, unknown> {
  return {
    organisation_id: input.organisationId,
    project_id: input.projectId,
    type: input.type,
    title: input.title,
    description: input.description,
    category: input.category,
    status: input.status,
    priority: input.priority,
    related_drawing: input.related_drawing,
    related_takeoff_item_id: input.related_takeoff_item_id,
    ai_generated: false,
    reviewed: false,
  };
}
