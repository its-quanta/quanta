import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import type { GeminiSuggestion } from "@/src/lib/ai-review/document-analysis/parse-gemini-suggestions";
import { PROJECT_DOCUMENTS_BUCKET } from "@/src/lib/documents/constants";
import { tryCreateAdminClient } from "@/src/lib/supabase/admin";
import { createClient } from "@/src/lib/supabase/server";
import type { Document, DocumentProcessingStatus } from "@/src/types/database";

const DOCUMENT_PAGES_CONFLICT_TARGET = "document_id,page_number";

export type DocumentPagesAnalysisStatusResult = {
  ok: boolean;
  attempted: number;
  succeeded: number;
  failed: number;
  skipReason?: string;
};

type DocumentPagesWriteContext =
  | {
      ok: true;
      organisationId: string;
      projectId: string;
      documentId: string;
    }
  | {
      ok: false;
      reason: string;
    };

export type InsertAiReviewSuggestionsResult =
  | { ok: true; count: number }
  | { ok: false; reason: string; message: string; detail?: string };

type InsertAiReviewSuggestionsOptions = {
  verifiedOrganisationId?: string;
};

type AiReviewItemInsertRow = {
  organisation_id: string;
  project_id: string;
  status: "pending";
  confidence: number | null;
  trade: string;
  description: string;
  quantity: number;
  unit: string;
  reasoning: string | null;
  source_document_id: string;
  drawing_reference: string | null;
  sheet_number: string | null;
  page_number: number | null;
};

function sanitiseConfidence(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100));
  }
  return Math.max(0, Math.min(1, value));
}

function sanitisePageNumber(value: number | null | undefined): number | null {
  if (value == null || value <= 0 || Number.isNaN(value)) {
    return null;
  }
  return Math.floor(value);
}

function sanitiseQuantity(value: number | null | undefined): number {
  const n = value ?? 0;
  if (Number.isNaN(n) || n < 0) {
    return 0;
  }
  return n;
}

function isRowLevelSecurityError(message: string): boolean {
  return /row-level security|permission denied|not authorized/i.test(message);
}

function isMissingRpcError(message: string): boolean {
  return /could not find the function|function .* does not exist/i.test(message);
}

function buildRpcSuggestionPayload(
  suggestions: GeminiSuggestion[],
  fallbackDocumentId: string
) {
  return suggestions.map((suggestion) => ({
    trade: suggestion.trade,
    description: suggestion.description,
    quantity: sanitiseQuantity(suggestion.quantity),
    unit: suggestion.unit?.trim() || "each",
    reasoning: suggestion.reasoning,
    confidence: sanitiseConfidence(suggestion.confidence),
    drawing_reference: suggestion.drawing_reference,
    sheet_number: suggestion.sheet_number,
    page_number: sanitisePageNumber(suggestion.page_number),
    source_document_id: suggestion.source_document_id ?? fallbackDocumentId,
  }));
}

async function insertAiReviewRowsDirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: AiReviewItemInsertRow[]
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from("ai_review_items").insert(rows);
  return { error };
}

async function insertAiReviewRowsViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  documentId: string,
  tradeFocus: string,
  suggestions: GeminiSuggestion[]
): Promise<{ count: number | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc("insert_ai_review_suggestions", {
    p_project_id: projectId,
    p_document_id: documentId,
    p_trade_focus: tradeFocus,
    p_suggestions: buildRpcSuggestionPayload(suggestions, documentId),
  });

  if (error) {
    return { count: null, error };
  }

  const count = typeof data === "number" ? data : Number(data);
  return {
    count: Number.isNaN(count) ? 0 : count,
    error: null,
  };
}

function buildAiReviewItemRows(
  context: {
    organisationId: string;
    projectId: string;
    documentId: string;
    tradeFocus: string;
  },
  suggestions: GeminiSuggestion[]
): AiReviewItemInsertRow[] {
  return suggestions.map((suggestion) => ({
    organisation_id: context.organisationId,
    project_id: context.projectId,
    status: "pending" as const,
    confidence: sanitiseConfidence(suggestion.confidence),
    trade: (suggestion.trade || context.tradeFocus || "General").trim() || "General",
    description: suggestion.description.trim(),
    quantity: sanitiseQuantity(suggestion.quantity),
    unit: suggestion.unit?.trim() || "each",
    reasoning: suggestion.reasoning?.trim() ?? null,
    source_document_id: context.documentId,
    drawing_reference: suggestion.drawing_reference?.trim() ?? null,
    sheet_number: suggestion.sheet_number?.trim() ?? null,
    page_number: sanitisePageNumber(suggestion.page_number),
  }));
}

export async function downloadDocumentBytes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string
): Promise<{ bytes: Buffer; sizeBytes: number } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return { error: ANALYSIS_ERRORS.couldNotDownload };
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    sizeBytes: arrayBuffer.byteLength,
  };
}

export async function fetchProjectDocument(
  projectId: string,
  organisationId: string,
  documentId: string
): Promise<Document | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, organisation_id, project_id, file_name, storage_path, file_type, document_type, processing_status, page_count"
    )
    .eq("id", documentId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as Document;
}

export async function fetchProjectTradeScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  organisationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("trade_scope")
    .eq("id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    if (error && !/column .* does not exist/i.test(error.message)) {
      console.warn("[document-analysis] trade_scope lookup skipped:", error.message);
    }
    return null;
  }

  const scope = (data as { trade_scope?: string | null }).trade_scope?.trim();
  return scope || null;
}

export async function tryUpdateDocumentAnalysisStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  organisationId: string,
  projectId: string,
  nextStatus: DocumentProcessingStatus
) {
  const { error } = await supabase
    .from("documents")
    .update({ processing_status: nextStatus })
    .eq("id", documentId)
    .eq("organisation_id", organisationId)
    .eq("project_id", projectId);

  if (error) {
    console.warn(
      "[document-analysis] processing_status update skipped:",
      documentId,
      nextStatus,
      error.message
    );
  }
}

async function resolveDocumentPagesWriteContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  documentId: string
): Promise<DocumentPagesWriteContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.organisation_id) {
    return { ok: false, reason: "profile_missing_organisation" };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organisation_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, reason: "project_not_found" };
  }

  if (project.organisation_id !== profile.organisation_id) {
    return { ok: false, reason: "project_organisation_mismatch" };
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, organisation_id, project_id")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, reason: "document_not_found" };
  }

  if (document.organisation_id !== project.organisation_id) {
    return { ok: false, reason: "document_organisation_mismatch" };
  }

  return {
    ok: true,
    organisationId: project.organisation_id,
    projectId: project.id,
    documentId: document.id,
  };
}

function logDocumentPagesUpsertFailure(input: {
  conflictTarget: string;
  documentId: string;
  pageNumber: number;
  organisationIdPresent: boolean;
  projectIdPresent: boolean;
  message: string;
}) {
  console.warn("[document-analysis] document_pages upsert failed", {
    conflictTarget: input.conflictTarget,
    documentId: input.documentId,
    pageNumber: input.pageNumber,
    organisationIdPresent: input.organisationIdPresent,
    projectIdPresent: input.projectIdPresent,
    message: input.message,
  });
}

async function upsertDocumentPageRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    organisation_id: string;
    project_id: string;
    document_id: string;
    page_number: number;
    include_in_analysis: boolean;
    analysis_status: string;
  }
): Promise<boolean> {
  if (!row.organisation_id || !row.project_id || !row.document_id || !row.page_number) {
    logDocumentPagesUpsertFailure({
      conflictTarget: DOCUMENT_PAGES_CONFLICT_TARGET,
      documentId: row.document_id,
      pageNumber: row.page_number,
      organisationIdPresent: Boolean(row.organisation_id),
      projectIdPresent: Boolean(row.project_id),
      message: "Required document_pages fields missing before upsert.",
    });
    return false;
  }

  const { error } = await supabase.from("document_pages").upsert(row, {
    onConflict: DOCUMENT_PAGES_CONFLICT_TARGET,
  });

  if (!error) {
    return true;
  }

  if (/column .+ does not exist/i.test(error.message)) {
    console.warn("[document-analysis] document_pages upsert skipped:", error.message);
    return false;
  }

  logDocumentPagesUpsertFailure({
    conflictTarget: DOCUMENT_PAGES_CONFLICT_TARGET,
    documentId: row.document_id,
    pageNumber: row.page_number,
    organisationIdPresent: Boolean(row.organisation_id),
    projectIdPresent: Boolean(row.project_id),
    message: error.message,
  });

  const { data: existing, error: lookupError } = await supabase
    .from("document_pages")
    .select("id")
    .eq("document_id", row.document_id)
    .eq("page_number", row.page_number)
    .maybeSingle();

  if (lookupError) {
    console.warn("[document-analysis] document_pages lookup failed", {
      documentId: row.document_id,
      pageNumber: row.page_number,
      message: lookupError.message,
    });
    return false;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("document_pages")
      .update({
        organisation_id: row.organisation_id,
        project_id: row.project_id,
        include_in_analysis: row.include_in_analysis,
        analysis_status: row.analysis_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      logDocumentPagesUpsertFailure({
        conflictTarget: DOCUMENT_PAGES_CONFLICT_TARGET,
        documentId: row.document_id,
        pageNumber: row.page_number,
        organisationIdPresent: Boolean(row.organisation_id),
        projectIdPresent: Boolean(row.project_id),
        message: updateError.message,
      });
      return false;
    }

    return true;
  }

  const { error: insertError } = await supabase.from("document_pages").insert(row);

  if (insertError) {
    logDocumentPagesUpsertFailure({
      conflictTarget: DOCUMENT_PAGES_CONFLICT_TARGET,
      documentId: row.document_id,
      pageNumber: row.page_number,
      organisationIdPresent: Boolean(row.organisation_id),
      projectIdPresent: Boolean(row.project_id),
      message: insertError.message,
    });
    return false;
  }

  return true;
}

export async function updateDocumentPagesAnalysisStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  documentId: string,
  pageNumbers: number[],
  status: string
): Promise<DocumentPagesAnalysisStatusResult> {
  const context = await resolveDocumentPagesWriteContext(
    supabase,
    projectId,
    documentId
  );

  if (!context.ok) {
    console.warn("[document-analysis] document_pages write skipped", {
      projectId,
      documentId,
      reason: context.reason,
    });
    return {
      ok: false,
      attempted: pageNumbers.length,
      succeeded: 0,
      failed: pageNumbers.length,
      skipReason: context.reason,
    };
  }

  let succeeded = 0;
  let failed = 0;

  for (const pageNumber of pageNumbers) {
    const ok = await upsertDocumentPageRow(supabase, {
      organisation_id: context.organisationId,
      project_id: context.projectId,
      document_id: context.documentId,
      page_number: pageNumber,
      include_in_analysis: true,
      analysis_status: status,
    });

    if (ok) {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  return {
    ok: failed === 0,
    attempted: pageNumbers.length,
    succeeded,
    failed,
  };
}

export async function insertAiReviewSuggestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  documentId: string,
  tradeFocus: string,
  suggestions: GeminiSuggestion[],
  options?: InsertAiReviewSuggestionsOptions
): Promise<InsertAiReviewSuggestionsResult> {
  if (suggestions.length === 0) {
    return { ok: true, count: 0 };
  }

  const context = await resolveDocumentPagesWriteContext(
    supabase,
    projectId,
    documentId
  );

  if (!context.ok) {
    console.warn("[document-analysis] ai_review_items write skipped", {
      projectId,
      documentId,
      reason: context.reason,
    });

    if (context.reason === "not_authenticated") {
      return {
        ok: false,
        reason: context.reason,
        message: ANALYSIS_ERRORS.analysisSessionExpired,
      };
    }

    return {
      ok: false,
      reason: context.reason,
      message: ANALYSIS_ERRORS.suggestionsSaveFailed,
      detail: context.reason,
    };
  }

  const organisationId = options?.verifiedOrganisationId ?? context.organisationId;
  if (organisationId !== context.organisationId) {
    console.warn("[document-analysis] ai_review_items organisation mismatch", {
      projectId,
      documentId,
      verifiedOrganisationId: options?.verifiedOrganisationId ?? null,
      contextOrganisationId: context.organisationId,
    });
    return {
      ok: false,
      reason: "organisation_mismatch",
      message: ANALYSIS_ERRORS.suggestionsSaveFailed,
    };
  }

  const rows = buildAiReviewItemRows(
    {
      organisationId: context.organisationId,
      projectId: context.projectId,
      documentId: context.documentId,
      tradeFocus,
    },
    suggestions
  );

  const rpcResult = await insertAiReviewRowsViaRpc(
    supabase,
    projectId,
    documentId,
    tradeFocus,
    suggestions
  );

  if (!rpcResult.error && rpcResult.count != null) {
    console.info("[document-analysis] ai_review_items insert via rpc", {
      projectId,
      documentId,
      insertedCount: rpcResult.count,
    });
    return { ok: true, count: rpcResult.count };
  }

  const rpcErrorMessage = rpcResult.error?.message ?? "unknown_rpc_error";
  const useDirectInsertFallback = isMissingRpcError(rpcErrorMessage);

  if (!useDirectInsertFallback) {
    console.error("[document-analysis] ai_review_items rpc insert failed", {
      projectId,
      documentId,
      attemptedCount: suggestions.length,
      message: rpcErrorMessage,
    });

    if (/not_authenticated/i.test(rpcErrorMessage)) {
      return {
        ok: false,
        reason: "not_authenticated",
        message: ANALYSIS_ERRORS.analysisSessionExpired,
        detail: rpcErrorMessage,
      };
    }

    return {
      ok: false,
      reason: "insert_failed",
      message: ANALYSIS_ERRORS.suggestionsSaveFailed,
      detail: rpcErrorMessage,
    };
  }

  console.warn("[document-analysis] ai_review_items rpc unavailable, using direct insert", {
    projectId,
    documentId,
    message: rpcErrorMessage,
  });

  let { error: insertError } = await insertAiReviewRowsDirect(supabase, rows);

  if (insertError && isRowLevelSecurityError(insertError.message)) {
    const admin = tryCreateAdminClient();
    if (admin) {
      console.warn("[document-analysis] ai_review_items retry_with_service_role", {
        projectId,
        documentId,
        attemptedCount: rows.length,
      });
      ({ error: insertError } = await insertAiReviewRowsDirect(admin, rows));
    }
  }

  if (insertError) {
    console.error("[document-analysis] ai_review_items insert failed", {
      projectId,
      documentId,
      attemptedCount: rows.length,
      message: insertError.message,
      hint:
        isRowLevelSecurityError(insertError.message)
          ? "Apply migration 20260603150000_ai_review_items_grants_and_insert_rpc.sql"
          : undefined,
    });
    return {
      ok: false,
      reason: isRowLevelSecurityError(insertError.message)
        ? "row_level_security"
        : "insert_failed",
      message: ANALYSIS_ERRORS.suggestionsSaveFailed,
      detail: insertError.message,
    };
  }

  return { ok: true, count: rows.length };
}
