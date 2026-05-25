import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError, isRlsPolicyError } from "@/src/lib/auth/profile-schema";
import type { TakeoffItem, TakeoffItemStatus } from "@/src/types/database";

/** Full schema with structured drawing references. */
export const TAKEOFF_STRUCTURED_SELECT =
  "id, organisation_id, project_id, source_document_id, document_page_id, trade, item_name, description, quantity, unit, drawing_reference, page_number, sheet_number, detail_reference, specification_reference, confidence_score, ai_generated, reviewed, status, notes, sort_order, created_at, updated_at" as const;

/** Manual takeoff before structured reference columns. */
export const TAKEOFF_EXTENDED_SELECT =
  "id, organisation_id, project_id, source_document_id, trade, item_name, description, quantity, unit, drawing_reference, page_number, confidence_score, ai_generated, reviewed, status, notes, sort_order, created_at, updated_at" as const;

/** Schema without sort_order for older tables. */
export const TAKEOFF_STANDARD_SELECT =
  "id, organisation_id, project_id, source_document_id, trade, item_name, description, quantity, unit, drawing_reference, page_number, confidence_score, ai_generated, reviewed, status, notes, created_at, updated_at" as const;

/** Early docs-style takeoff table. */
export const TAKEOFF_LEGACY_SELECT =
  "id, organisation_id, project_id, item_code, description, location, unit, quantity, notes, source, created_at, updated_at" as const;

/** Minimal readable takeoff rows. */
export const TAKEOFF_MINIMAL_SELECT =
  "id, organisation_id, project_id, description, quantity, unit, notes, created_at, updated_at" as const;

const TAKEOFF_SELECT_FALLBACKS = [
  TAKEOFF_STRUCTURED_SELECT,
  TAKEOFF_EXTENDED_SELECT,
  TAKEOFF_STANDARD_SELECT,
  TAKEOFF_LEGACY_SELECT,
  TAKEOFF_MINIMAL_SELECT,
] as const;

export type TakeoffItemRow = {
  id: string;
  organisation_id: string;
  project_id: string;
  created_at: string;
  updated_at?: string;
  source_document_id?: string | null;
  document_page_id?: string | null;
  trade?: string | null;
  item_name?: string | null;
  item_code?: string | null;
  description?: string | null;
  location?: string | null;
  quantity?: number | null;
  unit?: string | null;
  drawing_reference?: string | null;
  page_number?: number | null;
  sheet_number?: string | null;
  detail_reference?: string | null;
  specification_reference?: string | null;
  confidence_score?: number | null;
  ai_generated?: boolean | null;
  reviewed?: boolean | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  sort_order?: number | null;
};

const TAKEOFF_STATUSES = new Set<string>([
  "draft",
  "ai_draft",
  "needs_review",
  "reviewed",
  "priced",
  "excluded",
]);

function normalizeStatus(
  status: string | null | undefined,
  source: string | null | undefined,
  reviewed: boolean | null | undefined
): TakeoffItemStatus {
  if (status && TAKEOFF_STATUSES.has(status)) {
    return status as TakeoffItemStatus;
  }

  if (reviewed || source === "ai_approved") {
    return "reviewed";
  }

  return "needs_review";
}

export function normalizeTakeoffItem(row: TakeoffItemRow): TakeoffItem {
  const itemName = row.item_name ?? row.item_code ?? "";
  const descriptionParts = [row.description, row.location].filter(Boolean);
  const reviewed = Boolean(row.reviewed);

  return {
    id: row.id,
    organisation_id: row.organisation_id,
    project_id: row.project_id,
    source_document_id: row.source_document_id ?? null,
    document_page_id: row.document_page_id ?? null,
    trade: row.trade ?? "General",
    item_name: itemName,
    description:
      descriptionParts.length > 0 ? descriptionParts.join(" · ") : null,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit ?? "each",
    drawing_reference: row.drawing_reference ?? null,
    page_number:
      row.page_number === null || row.page_number === undefined
        ? null
        : Number(row.page_number),
    sheet_number: row.sheet_number ?? null,
    detail_reference: row.detail_reference ?? null,
    specification_reference: row.specification_reference ?? null,
    confidence_score:
      row.confidence_score === null || row.confidence_score === undefined
        ? null
        : Number(row.confidence_score),
    ai_generated: Boolean(row.ai_generated),
    reviewed,
    status: normalizeStatus(row.status, row.source, reviewed),
    notes: row.notes ?? null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

type SupabaseQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

async function runTakeoffListQuery(
  supabase: SupabaseClient,
  select: string,
  projectId: string,
  organisationId: string
): Promise<SupabaseQueryResult> {
  const withSortOrder = await supabase
    .from("takeoff_items")
    .select(select)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!withSortOrder.error) {
    return withSortOrder;
  }

  if (isMissingColumnError(withSortOrder.error.message)) {
    return supabase
      .from("takeoff_items")
      .select(select)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true });
  }

  return withSortOrder;
}

async function queryWithTakeoffSelectFallback<T>(
  run: (select: string) => Promise<SupabaseQueryResult>
): Promise<{ data: T; error: string | null }> {
  let lastError: string | null = null;

  for (const select of TAKEOFF_SELECT_FALLBACKS) {
    const { data, error } = await run(select);

    if (!error) {
      return { data: data as T, error: null };
    }

    lastError = error.message;

    if (!isMissingColumnError(error.message)) {
      return { data: data as T, error: error.message };
    }
  }

  return { data: null as T, error: lastError };
}

export async function queryTakeoffItemsForProject(
  supabase: SupabaseClient,
  projectId: string,
  organisationId: string
): Promise<TakeoffItem[]> {
  const { data, error } = await queryWithTakeoffSelectFallback<TakeoffItemRow[] | null>(
    (select) => runTakeoffListQuery(supabase, select, projectId, organisationId)
  );

  if (error) {
    throw new Error(error);
  }

  return (data ?? []).map(normalizeTakeoffItem);
}

export async function queryTakeoffItemById(
  supabase: SupabaseClient,
  itemId: string,
  organisationId: string
): Promise<TakeoffItem | null> {
  const { data, error } = await queryWithTakeoffSelectFallback<TakeoffItemRow | null>(
    async (select) =>
      supabase
        .from("takeoff_items")
        .select(select)
        .eq("id", itemId)
        .eq("organisation_id", organisationId)
        .maybeSingle()
  );

  if (error) {
    throw new Error(error);
  }

  return data ? normalizeTakeoffItem(data) : null;
}

export async function getNextTakeoffSortOrder(
  supabase: SupabaseClient,
  projectId: string,
  organisationId: string
): Promise<number> {
  const sortOrderResult = await supabase
    .from("takeoff_items")
    .select("sort_order")
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sortOrderResult.error && sortOrderResult.data) {
    return Number(sortOrderResult.data.sort_order) + 1;
  }

  if (
    sortOrderResult.error &&
    !isMissingColumnError(sortOrderResult.error.message)
  ) {
    return 0;
  }

  const { count } = await supabase
    .from("takeoff_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  return count ?? 0;
}

export type TakeoffInsertPayload = Record<string, unknown>;

function stripMissingInsertColumn(
  payload: TakeoffInsertPayload,
  errorMessage: string
): TakeoffInsertPayload | null {
  const schemaCacheMatch = errorMessage.match(
    /Could not find the '([^']+)' column of/i
  );
  const postgresMatch = errorMessage.match(/column ([^\s]+) does not exist/i);
  const missingColumn = schemaCacheMatch?.[1] ?? postgresMatch?.[1];

  if (!missingColumn || !(missingColumn in payload)) {
    return null;
  }

  const { [missingColumn]: _removed, ...nextPayload } = payload;
  void _removed;

  return nextPayload;
}

export async function insertTakeoffItemWithFallback(
  supabase: SupabaseClient,
  payloads: TakeoffInsertPayload[]
): Promise<{ itemId: string | null; error: string | null }> {
  let lastError: string | null = null;

  for (const payload of payloads) {
    let attemptPayload: TakeoffInsertPayload = { ...payload };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data, error } = await supabase
        .from("takeoff_items")
        .insert(attemptPayload)
        .select("id")
        .maybeSingle();

      if (!error) {
        return {
          itemId: data?.id ? String(data.id) : null,
          error: null,
        };
      }

      lastError = error.message;

      if (isRlsPolicyError(error.message)) {
        return {
          itemId: null,
          error:
            "Could not save takeoff item. Check you are signed in and have access to this project.",
        };
      }

      if (!isMissingColumnError(error.message)) {
        return { itemId: null, error: error.message };
      }

      const nextPayload = stripMissingInsertColumn(
        attemptPayload,
        error.message
      );

      if (!nextPayload) {
        break;
      }

      attemptPayload = nextPayload;
    }
  }

  return { itemId: null, error: lastError };
}

export async function updateTakeoffItemWithFallback(
  supabase: SupabaseClient,
  itemId: string,
  projectId: string,
  organisationId: string,
  payload: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("takeoff_items")
    .update(payload)
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  if (!error) {
    return { error: null };
  }

  if (!isMissingColumnError(error.message)) {
    return { error: error.message };
  }

  const { sort_order, trade, item_name, status, reviewed, ai_generated, ...legacyPayload } =
    payload;

  void sort_order;
  void trade;
  void item_name;
  void status;
  void reviewed;
  void ai_generated;

  const { error: legacyError } = await supabase
    .from("takeoff_items")
    .update(legacyPayload)
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  if (legacyError) {
    return { error: legacyError.message };
  }

  return { error: null };
}
