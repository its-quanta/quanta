import "server-only";

import { revalidatePath } from "next/cache";

import {
  ANALYSIS_RUN_COLUMNS,
  ANALYSIS_RUN_STAGE,
} from "@/src/lib/analysis-runs/constants";
import { errorReferenceFromMessage } from "@/src/lib/analysis-runs/error-reference";
import type {
  AnalysisRunInputPayload,
  AnalysisRunRow,
} from "@/src/lib/analysis-runs/types";
import { countLowConfidenceSuggestions } from "@/src/lib/ai-review/document-analysis/analysis-summary";
import {
  MAX_ANALYSIS_BATCH_BYTES,
  SUPPORTED_ANALYSIS_MIME_TYPES,
} from "@/src/lib/ai-review/document-analysis/constants";
import {
  downloadDocumentBytes,
  fetchProjectDocument,
  fetchProjectTradeScope,
  insertAiReviewSuggestions,
  tryUpdateDocumentAnalysisStatus,
  updateDocumentPagesAnalysisStatus,
} from "@/src/lib/ai-review/document-analysis/document-analysis-db";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import {
  DEFAULT_DOCUMENT_ANALYSIS_MODE,
  normalizeDocumentAnalysisMode,
} from "@/src/lib/ai-review/document-analysis/types";
import { extractPdfPages, isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import { createClient } from "@/src/lib/supabase/server";

function isSupportedAnalysisMimeType(mimeType: string | null | undefined): boolean {
  const type = (mimeType ?? "").toLowerCase();
  return (SUPPORTED_ANALYSIS_MIME_TYPES as readonly string[]).includes(type);
}

async function patchAnalysisRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase
    .from("analysis_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", runId);

  if (error) {
    console.error("[analysis-run] patch_failed", runId, error.message);
  }
}

async function setRunStage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
  currentStage: string,
  extra?: Partial<{
    status: AnalysisRunRow["status"];
    progress: number;
    documents_total: number;
    documents_completed: number;
    pages_total: number;
    pages_completed: number;
  }>
) {
  const progress =
    extra?.progress ??
    (currentStage === ANALYSIS_RUN_STAGE.complete
      ? 100
      : undefined);

  await patchAnalysisRun(supabase, runId, {
    status:
      extra?.status ??
      (currentStage === ANALYSIS_RUN_STAGE.complete ? "completed" : "processing"),
    current_stage: currentStage,
    ...(progress != null ? { progress } : {}),
    ...extra,
  });
}

async function failRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
  errorMessage: string,
  errorReference?: string
) {
  await patchAnalysisRun(supabase, runId, {
    status: "failed",
    error_message: errorMessage,
    error_reference: errorReference ?? errorReferenceFromMessage(errorMessage),
    completed_at: new Date().toISOString(),
  });
}

export async function processDocumentAnalysisRun(
  runId: string,
  inputPayload: AnalysisRunInputPayload
): Promise<void> {
  const supabase = await createClient();

  const { data: runRow, error: loadError } = await supabase
    .from("analysis_runs")
    .select(ANALYSIS_RUN_COLUMNS)
    .eq("id", runId)
    .maybeSingle();

  if (loadError || !runRow) {
    console.error("[analysis-run] load_failed", runId, loadError?.message);
    return;
  }

  const run = runRow as unknown as AnalysisRunRow;

  if (run.status === "completed" || run.status === "failed") {
    return;
  }

  const { data: claimed } = await supabase
    .from("analysis_runs")
    .update({
      status: "processing",
      current_stage: ANALYSIS_RUN_STAGE.preparing,
      started_at: run.started_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .in("status", ["queued", "processing"])
    .select("id")
    .maybeSingle();

  if (!claimed && run.status !== "processing") {
    return;
  }

  const input = inputPayload;
  const projectId = run.project_id;
  const organisationId = run.organisation_id;
  const selectedPages = input.resolvedSelectedPages ?? [];

  await setRunStage(supabase, runId, ANALYSIS_RUN_STAGE.preparing, {
    status: "processing",
    progress: 10,
    documents_total: 1,
    pages_total: selectedPages.length || run.pages_total,
  });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    await failRun(supabase, runId, ANALYSIS_ERRORS.geminiKeyMissing);
    return;
  }

  const doc = await fetchProjectDocument(
    projectId,
    organisationId,
    input.documentId
  );

  if (!doc || !isSupportedAnalysisMimeType(doc.file_type)) {
    await failRun(supabase, runId, ANALYSIS_ERRORS.analysisFailed);
    return;
  }

  const storagePath = doc.storage_path?.trim();
  if (!storagePath) {
    await failRun(supabase, runId, ANALYSIS_ERRORS.storagePathMissing);
    return;
  }

  const downloaded = await downloadDocumentBytes(supabase, storagePath);
  if ("error" in downloaded) {
    await failRun(supabase, runId, downloaded.error);
    return;
  }

  const mimeType = (doc.file_type || "application/pdf").toLowerCase();
  const isPdf = isPdfMimeType(mimeType);

  if (selectedPages.length === 0) {
    await failRun(supabase, runId, ANALYSIS_ERRORS.noPagesSelected);
    return;
  }

  await tryUpdateDocumentAnalysisStatus(
    supabase,
    doc.id,
    organisationId,
    projectId,
    "pending"
  );

  await setRunStage(supabase, runId, ANALYSIS_RUN_STAGE.extracting, {
    progress: 30,
    pages_completed: 0,
  });

  let payloadBytes: Buffer = downloaded.bytes;
  let payloadMime = mimeType;
  let payloadName = doc.file_name;

  if (isPdf) {
    try {
      const extracted = await extractPdfPages(downloaded.bytes, selectedPages);
      payloadBytes = Buffer.from(extracted);
      payloadMime = "application/pdf";
      payloadName = `${doc.file_name.replace(/\.pdf$/i, "")} (pages ${selectedPages.join(", ")}).pdf`;
    } catch (extractError) {
      console.error("[analysis-run] pdf_split_failed:", extractError);
      await tryUpdateDocumentAnalysisStatus(
        supabase,
        doc.id,
        organisationId,
        projectId,
        "failed"
      );
      const message =
        extractError instanceof Error &&
        extractError.message.includes("outside this document")
          ? ANALYSIS_ERRORS.pageRangeOutsideDocument
          : ANALYSIS_ERRORS.pdfExtractionFailed;
      await failRun(supabase, runId, message);
      return;
    }
  }

  if (payloadBytes.byteLength > MAX_ANALYSIS_BATCH_BYTES) {
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      organisationId,
      projectId,
      "failed"
    );
    await failRun(supabase, runId, ANALYSIS_ERRORS.batchTooLarge);
    return;
  }

  await setRunStage(supabase, runId, ANALYSIS_RUN_STAGE.extracting, {
    progress: 30,
    pages_completed: selectedPages.length,
  });

  const base64Payload = payloadBytes.toString("base64");

  const { callGeminiForPdfSuggestions, validateAnalysisPayload } = await import(
    "@/src/lib/ai-review/document-analysis/gemini"
  );

  const payloadValidation = validateAnalysisPayload({
    mimeType: payloadMime,
    base64: base64Payload,
    byteSize: payloadBytes.byteLength,
    selectedPagesCount: selectedPages.length,
    isPdf,
  });

  if (!payloadValidation.valid) {
    const { userMessageForGeminiFailure } = await import(
      "@/src/lib/ai-review/document-analysis/gemini-errors"
    );
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      organisationId,
      projectId,
      "failed"
    );
    await failRun(
      supabase,
      runId,
      userMessageForGeminiFailure(payloadValidation.code)
    );
    return;
  }

  await setRunStage(supabase, runId, ANALYSIS_RUN_STAGE.sending, {
    progress: 50,
    documents_completed: 0,
  });

  await setRunStage(supabase, runId, ANALYSIS_RUN_STAGE.generating, {
    progress: 70,
  });

  const projectTradeScope = await fetchProjectTradeScope(
    supabase,
    projectId,
    organisationId
  );

  const gemini = await callGeminiForPdfSuggestions({
    tradeFocus: input.tradeFocus,
    analysisMode: normalizeDocumentAnalysisMode(
      input.analysisMode ?? DEFAULT_DOCUMENT_ANALYSIS_MODE
    ),
    projectTradeScope,
    documents: [
      {
        id: doc.id,
        fileName: payloadName,
        mimeType: payloadMime,
        base64: base64Payload,
        pageNumbers: isPdf ? selectedPages : undefined,
      },
    ],
    logContext: {
      documentId: doc.id,
      fileName: doc.file_name,
      miniPdfBytes: payloadBytes.byteLength,
      selectedPagesCount: selectedPages.length,
      geminiApiKeyPresent: Boolean(apiKey),
    },
  });

  if (gemini.error) {
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      organisationId,
      projectId,
      "failed"
    );
    await updateDocumentPagesAnalysisStatus(
      supabase,
      projectId,
      doc.id,
      selectedPages,
      "failed"
    );

    const parseFailureMessage =
      gemini.parseFailed && gemini.rawResponsePreview
        ? `${gemini.error}\n\nRaw preview: ${gemini.rawResponsePreview}`
        : gemini.error;

    if (gemini.parseDebug) {
      console.warn("[analysis-run] gemini_parse_failed", {
        runId,
        rawTextLength: gemini.parseDebug.rawTextLength,
        jsonParsed: gemini.parseDebug.jsonParsed ? "yes" : "no",
        suggestionsParsed: gemini.parseDebug.suggestionsParsed,
        droppedCount: gemini.parseDebug.dropped.length,
        dropped: gemini.parseDebug.dropped,
      });
    }

    await failRun(
      supabase,
      runId,
      parseFailureMessage,
      gemini.parseFailed ? "gemini_parse_failed" : undefined
    );
    return;
  }

  await setRunStage(supabase, runId, ANALYSIS_RUN_STAGE.saving, {
    progress: 90,
    documents_completed: 0,
  });

  let createdCount = 0;

  if (gemini.suggestions.length > 0) {
    const insertResult = await insertAiReviewSuggestions(
      supabase,
      projectId,
      doc.id,
      input.tradeFocus,
      gemini.suggestions,
      { verifiedOrganisationId: organisationId }
    );

    if (!insertResult.ok) {
      console.error("[analysis-run] ai_review_items_insert_failed", {
        runId,
        attemptedCount: gemini.suggestions.length,
        reason: insertResult.reason,
        message: insertResult.message,
        detail: insertResult.detail ?? null,
      });
      await tryUpdateDocumentAnalysisStatus(
        supabase,
        doc.id,
        organisationId,
        projectId,
        "failed"
      );
      await failRun(
        supabase,
        runId,
        insertResult.message,
        insertResult.reason === "not_authenticated"
          ? "analysis_session_expired"
          : "suggestions_save_failed"
      );
      return;
    }

    createdCount = insertResult.count;
  }

  await tryUpdateDocumentAnalysisStatus(
    supabase,
    doc.id,
    organisationId,
    projectId,
    "ready"
  );

  const pageMetadataResult = await updateDocumentPagesAnalysisStatus(
    supabase,
    projectId,
    doc.id,
    selectedPages,
    "analysed"
  );

  const pageMetadataFailed = !pageMetadataResult.ok;
  if (pageMetadataFailed) {
    console.warn("[analysis-run] document_pages_metadata_partial_failure", {
      runId,
      attempted: pageMetadataResult.attempted,
      succeeded: pageMetadataResult.succeeded,
      failed: pageMetadataResult.failed,
      skipReason: pageMetadataResult.skipReason ?? null,
    });
  }

  const completedStage =
    pageMetadataFailed && createdCount > 0
      ? ANALYSIS_RUN_STAGE.completeWithPageMetadataWarning
      : ANALYSIS_RUN_STAGE.complete;

  await patchAnalysisRun(supabase, runId, {
    status: "completed",
    current_stage: completedStage,
    progress: 100,
    documents_total: 1,
    documents_completed: 1,
    pages_total: selectedPages.length,
    pages_completed: selectedPages.length,
    error_message:
      gemini.suggestions.length === 0
        ? ANALYSIS_ERRORS.emptySuggestions
        : null,
    error_reference: null,
    completed_at: new Date().toISOString(),
  });

  console.info("[analysis-run] completed", {
    runId,
    rawTextLength: gemini.parseDebug?.rawTextLength ?? null,
    jsonParsed: gemini.parseDebug?.jsonParsed ? "yes" : "no",
    suggestionsParsed: gemini.parseDebug?.suggestionsParsed ?? gemini.suggestions.length,
    insertedSuggestions: createdCount,
    droppedCount: gemini.parseDebug?.dropped.length ?? 0,
    dropped: gemini.parseDebug?.dropped ?? [],
    documentPagesAttempted: pageMetadataResult.attempted,
    documentPagesSucceeded: pageMetadataResult.succeeded,
    documentPagesFailed: pageMetadataResult.failed,
    pages: selectedPages.length,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`, "page");
}
