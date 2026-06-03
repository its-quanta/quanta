import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError, isRlsPolicyError } from "@/src/lib/auth/profile-schema";
import type {
  Document,
  DocumentClassification,
  DocumentProcessingStatus,
} from "@/src/types/database";

/** Full schema with storage_path. */
export const DOCUMENT_EXTENDED_SELECT =
  "id, organisation_id, project_id, file_name, storage_path, file_type, document_type, page_count, processing_status, ai_summary, created_at" as const;

/** Legacy schema using file_url instead of storage_path. */
export const DOCUMENT_LEGACY_URL_SELECT =
  "id, organisation_id, project_id, file_name, file_url, file_type, document_type, page_count, processing_status, ai_summary, created_at" as const;

/** Legacy schema with mime_type instead of file_type. */
export const DOCUMENT_LEGACY_MIME_SELECT =
  "id, organisation_id, project_id, file_name, file_url, mime_type, document_type, page_count, processing_status, ai_summary, created_at" as const;

/** Baseline columns for earliest documents tables. */
export const DOCUMENT_MINIMAL_SELECT =
  "id, organisation_id, project_id, file_name, created_at" as const;

const DOCUMENT_SELECT_FALLBACKS = [
  DOCUMENT_EXTENDED_SELECT,
  DOCUMENT_LEGACY_URL_SELECT,
  DOCUMENT_LEGACY_MIME_SELECT,
  DOCUMENT_MINIMAL_SELECT,
] as const;

export type DocumentRow = {
  id: string;
  organisation_id: string;
  project_id: string;
  file_name: string;
  created_at: string;
  storage_path?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  mime_type?: string | null;
  document_type?: string | null;
  page_count?: number | null;
  processing_status?: string | null;
  ai_summary?: string | null;
  uploaded_by?: string | null;
};

const DOCUMENT_CLASSIFICATIONS = new Set<string>([
  "architectural_drawings",
  "structural_drawings",
  "specification",
  "schedule",
  "scope_document",
  "photos_images",
  "other",
]);

const PROCESSING_STATUSES = new Set<string>(["pending", "ready", "failed"]);

function normalizeDocumentType(value: string | null | undefined): DocumentClassification {
  if (value && DOCUMENT_CLASSIFICATIONS.has(value)) {
    return value as DocumentClassification;
  }

  return "other";
}

function normalizeProcessingStatus(
  value: string | null | undefined
): DocumentProcessingStatus {
  if (!value) {
    return "ready";
  }

  const legacyMap: Record<string, DocumentProcessingStatus> = {
    analysing: "pending",
    analysed: "ready",
    analysis_failed: "failed",
  };

  const mapped = legacyMap[value] ?? value;
  if (PROCESSING_STATUSES.has(mapped)) {
    return mapped as DocumentProcessingStatus;
  }

  return "ready";
}

export function normalizeDocument(row: DocumentRow): Document {
  const storagePath = row.storage_path ?? row.file_url ?? "";

  return {
    id: row.id,
    organisation_id: row.organisation_id,
    project_id: row.project_id,
    file_name: row.file_name,
    storage_path: storagePath,
    file_type: row.file_type ?? row.mime_type ?? "application/octet-stream",
    document_type: normalizeDocumentType(row.document_type),
    page_count: row.page_count ?? null,
    processing_status: normalizeProcessingStatus(row.processing_status),
    ai_summary: row.ai_summary ?? null,
    uploaded_by: row.uploaded_by ?? null,
    created_at: row.created_at,
  };
}

type SupabaseQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

async function queryWithDocumentSelectFallback<T>(
  run: (select: string) => Promise<SupabaseQueryResult>
): Promise<{ data: T; error: string | null }> {
  let lastError: string | null = null;

  for (const select of DOCUMENT_SELECT_FALLBACKS) {
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

export async function queryDocumentsForProject(
  supabase: SupabaseClient,
  projectId: string,
  organisationId: string
): Promise<Document[]> {
  const { data, error } = await queryWithDocumentSelectFallback<DocumentRow[] | null>(
    async (select) =>
      supabase
        .from("documents")
        .select(select)
        .eq("project_id", projectId)
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false })
  );

  if (error) {
    throw new Error(error);
  }

  return (data ?? []).map(normalizeDocument);
}

export async function queryDocumentById(
  supabase: SupabaseClient,
  documentId: string,
  organisationId: string
): Promise<Document | null> {
  const { data, error } = await queryWithDocumentSelectFallback<DocumentRow | null>(
    async (select) =>
      supabase
        .from("documents")
        .select(select)
        .eq("id", documentId)
        .eq("organisation_id", organisationId)
        .maybeSingle()
  );

  if (error) {
    throw new Error(error);
  }

  return data ? normalizeDocument(data) : null;
}

export type DocumentInsertPayload = {
  id: string;
  organisation_id: string;
  project_id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  document_type: DocumentClassification;
  processing_status: DocumentProcessingStatus;
  uploaded_by?: string;
};

function buildDocumentInsertPayloads(
  payload: DocumentInsertPayload
): Record<string, unknown>[] {
  const shared = {
    id: payload.id,
    organisation_id: payload.organisation_id,
    project_id: payload.project_id,
    file_name: payload.file_name,
    file_type: payload.file_type,
    document_type: payload.document_type,
    processing_status: payload.processing_status,
  };

  const withUploader =
    payload.uploaded_by !== undefined
      ? { uploaded_by: payload.uploaded_by }
      : {};

  return [
    {
      ...shared,
      storage_path: payload.storage_path,
      ...withUploader,
    },
    {
      ...shared,
      file_url: payload.storage_path,
      ...withUploader,
    },
  ];
}

function stripMissingInsertColumn(
  payload: Record<string, unknown>,
  errorMessage: string
): Record<string, unknown> | null {
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

export async function insertDocumentWithFallback(
  supabase: SupabaseClient,
  projectId: string,
  payload: DocumentInsertPayload
): Promise<{ error: string | null; documentId: string | null }> {
  const insertPayloads = buildDocumentInsertPayloads(payload);

  let lastError: string | null = null;
  let sawRlsError = false;

  for (const basePayload of insertPayloads) {
    let attemptPayload: Record<string, unknown> = { ...basePayload };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { error } = await supabase.from("documents").insert(attemptPayload);

      if (!error) {
        return { error: null, documentId: payload.id };
      }

      lastError = error.message;

      if (isRlsPolicyError(error.message)) {
        sawRlsError = true;
        break;
      }

      if (!isMissingColumnError(error.message)) {
        return { error: error.message, documentId: null };
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

    if (sawRlsError) {
      break;
    }
  }

  if (sawRlsError) {
    return createDocumentRecordViaRpc(supabase, projectId, payload);
  }

  return { error: lastError, documentId: null };
}

export async function createDocumentRecordViaRpc(
  supabase: SupabaseClient,
  projectId: string,
  payload: DocumentInsertPayload
): Promise<{ error: string | null; documentId: string | null }> {
  const { data, error } = await supabase.rpc("create_document_record", {
    p_project_id: projectId,
    p_file_name: payload.file_name,
    p_storage_path: payload.storage_path,
    p_file_type: payload.file_type,
    p_document_type: payload.document_type,
    p_document_id: payload.id,
  });

  if (error) {
    return {
      error: isRlsPolicyError(error.message)
        ? "Document could not be saved. Check you are signed in and have access to this project."
        : error.message,
      documentId: null,
    };
  }

  return {
    error: null,
    documentId: data ? String(data) : payload.id,
  };
}

export async function updateDocumentProcessingStatus(
  supabase: SupabaseClient,
  documentId: string,
  organisationId: string,
  status: DocumentProcessingStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("documents")
    .update({ processing_status: status })
    .eq("id", documentId)
    .eq("organisation_id", organisationId);

  if (!error) {
    return { error: null };
  }

  if (isMissingColumnError(error.message)) {
    return { error: null };
  }

  return { error: error.message };
}
