"use server";

import { revalidatePath } from "next/cache";

import {
  LARGE_PDF_FULL_FILE_WARNING,
  MAX_ANALYSIS_BATCH_BYTES,
  MAX_ANALYSIS_BATCH_PAGES,
  SUPPORTED_ANALYSIS_MIME_TYPES,
  type DocumentPageType,
} from "@/src/lib/ai-review/document-analysis/constants";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import { resolveSelectedPagesForAnalysis } from "@/src/lib/ai-review/document-analysis/resolve-selected-pages";
import {
  estimatePdfBatchBytes,
  type PageSelectionPreset,
} from "@/src/lib/ai-review/document-analysis/page-selection";
import {
  extractPdfPages,
  getPdfPageCount,
  isPdfMimeType,
} from "@/src/lib/ai-review/document-analysis/pdf";
import { countLowConfidenceSuggestions, buildSuccessResult } from "@/src/lib/ai-review/document-analysis/analysis-summary";
import type {
  AiReviewTradeFocus,
  AnalyseDocumentsResult,
  AnalysisFailedDocument,
} from "@/src/lib/ai-review/document-analysis/types";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { PROJECT_DOCUMENTS_BUCKET } from "@/src/lib/documents/constants";
import { createClient } from "@/src/lib/supabase/server";
import type { Document, DocumentPage } from "@/src/types/database";

export type DocumentAnalysisCatalogItem = {
  id: string;
  fileName: string;
  documentType: string;
  mimeType: string;
  hasStoragePath: boolean;
  pageCount: number | null;
  isPdf: boolean;
  isSupported: boolean;
};

export type DocumentAnalysisMetadata = {
  documentId: string;
  fileName: string;
  documentType: string;
  mimeType: string;
  sizeBytes: number | null;
  pageCount: number | null;
  pageCountKnown: boolean;
  hasStoragePath: boolean;
  isTooLargeForFullAnalysis: boolean;
  maxPagesPerBatch: number;
  maxBatchBytes: number;
  guidance?: string;
};

export type AnalyseProjectDocumentsInput = {
  tradeFocus: AiReviewTradeFocus;
  documentId: string;
  /** Selected 1-based page numbers (camelCase). */
  selectedPages?: number[];
  /** Selected 1-based page numbers (snake_case). */
  selected_pages?: number[];
  pageNumbers?: number[];
  pageRangeInput?: string;
  preset?: PageSelectionPreset;
};

export type SaveDocumentPageInput = {
  documentId: string;
  pageNumber: number;
  pageLabel?: string | null;
  pageType?: DocumentPageType | null;
  includeInAnalysis?: boolean;
};

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

function isSupportedAnalysisMimeType(mimeType: string | null | undefined): boolean {
  const type = (mimeType ?? "").toLowerCase();
  return (SUPPORTED_ANALYSIS_MIME_TYPES as readonly string[]).includes(type);
}

function isKnownUnsupportedOfficeType(mimeType: string | null | undefined): boolean {
  const type = (mimeType ?? "").toLowerCase();
  return (
    type.includes("officedocument") ||
    type.includes("msword") ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("word")
  );
}

async function downloadDocumentBytes(
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

async function fetchProjectDocument(
  projectId: string,
  organisationId: string,
  documentId: string
): Promise<Document | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, organisation_id, project_id, file_name, storage_path, file_type, document_type, processing_status"
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

async function tryUpdateDocumentAnalysisStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  organisationId: string,
  projectId: string,
  nextStatus: "analysing" | "analysed" | "analysis_failed"
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

async function updateDocumentPagesAnalysisStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organisationId: string,
  projectId: string,
  documentId: string,
  pageNumbers: number[],
  status: string
) {
  for (const pageNumber of pageNumbers) {
    const { error } = await supabase.from("document_pages").upsert(
      {
        organisation_id: organisationId,
        project_id: projectId,
        document_id: documentId,
        page_number: pageNumber,
        include_in_analysis: true,
        analysis_status: status,
      },
      { onConflict: "document_id,page_number" }
    );

    if (error && !/column .+ does not exist/i.test(error.message)) {
      console.warn("[document-analysis] document_pages upsert skipped:", error.message);
      return;
    }
  }
}

export async function listDocumentsForAnalysisAction(
  projectId: string
): Promise<{ error?: string; documents?: DocumentAnalysisCatalogItem[] }> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, file_name, storage_path, file_type, document_type, page_count"
    )
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const documents = (data ?? []).map((row) => {
    const record = row as {
      id: string;
      file_name: string;
      storage_path: string | null;
      file_type: string | null;
      document_type: string;
      page_count: number | null;
    };
    const mimeType = (record.file_type ?? "").toLowerCase();
    const isPdf = isPdfMimeType(mimeType);
    const isSupported = isSupportedAnalysisMimeType(mimeType);

    return {
      id: record.id,
      fileName: record.file_name,
      documentType: record.document_type,
      mimeType: mimeType || "application/octet-stream",
      hasStoragePath: Boolean(record.storage_path?.trim()),
      pageCount: record.page_count ?? null,
      isPdf,
      isSupported,
    } satisfies DocumentAnalysisCatalogItem;
  });

  return { documents };
}

export async function getDocumentAnalysisMetadataAction(
  projectId: string,
  documentId: string
): Promise<{ error?: string; metadata?: DocumentAnalysisMetadata }> {
  const { profile } = await requireOrganisationProfile();
  const doc = await fetchProjectDocument(
    projectId,
    profile.organisation_id,
    documentId
  );

  if (!doc) {
    return { error: ANALYSIS_ERRORS.noDocumentSelected };
  }

  if (!isSupportedAnalysisMimeType(doc.file_type)) {
    return { error: ANALYSIS_ERRORS.unsupportedFileType };
  }

  const hasStoragePath = Boolean(doc.storage_path?.trim());
  const mimeType = (doc.file_type || "application/pdf").toLowerCase();
  const isPdf = isPdfMimeType(mimeType);

  if (!hasStoragePath) {
    return {
      metadata: {
        documentId: doc.id,
        fileName: doc.file_name,
        documentType: doc.document_type,
        mimeType,
        sizeBytes: null,
        pageCount: isPdf ? doc.page_count : 1,
        pageCountKnown: isPdf ? doc.page_count != null : true,
        hasStoragePath: false,
        isTooLargeForFullAnalysis: false,
        maxPagesPerBatch: MAX_ANALYSIS_BATCH_PAGES,
        maxBatchBytes: MAX_ANALYSIS_BATCH_BYTES,
      },
      error: ANALYSIS_ERRORS.storagePathMissing,
    };
  }

  const supabase = await createClient();
  const downloaded = await downloadDocumentBytes(supabase, doc.storage_path!.trim());
  if ("error" in downloaded) {
    return {
      error: ANALYSIS_ERRORS.couldNotDownload,
      metadata: {
        documentId: doc.id,
        fileName: doc.file_name,
        documentType: doc.document_type,
        mimeType,
        sizeBytes: null,
        pageCount: doc.page_count,
        pageCountKnown: doc.page_count != null,
        hasStoragePath: true,
        isTooLargeForFullAnalysis: false,
        maxPagesPerBatch: MAX_ANALYSIS_BATCH_PAGES,
        maxBatchBytes: MAX_ANALYSIS_BATCH_BYTES,
      },
    };
  }

  let pageCount: number | null = isPdf ? doc.page_count : 1;
  let pageCountKnown = !isPdf || doc.page_count != null;

  if (isPdf && pageCount == null) {
    try {
      pageCount = await getPdfPageCount(downloaded.bytes);
      pageCountKnown = true;
    } catch {
      pageCountKnown = false;
      pageCount = null;
    }
  }

  const isTooLargeForFullAnalysis =
    isPdf &&
    (downloaded.sizeBytes > MAX_ANALYSIS_BATCH_BYTES ||
      (pageCountKnown &&
        pageCount != null &&
        pageCount > MAX_ANALYSIS_BATCH_PAGES));

  return {
    metadata: {
      documentId: doc.id,
      fileName: doc.file_name,
      documentType: doc.document_type,
      mimeType,
      sizeBytes: downloaded.sizeBytes,
      pageCount,
      pageCountKnown,
      hasStoragePath: true,
      isTooLargeForFullAnalysis,
      maxPagesPerBatch: MAX_ANALYSIS_BATCH_PAGES,
      maxBatchBytes: MAX_ANALYSIS_BATCH_BYTES,
      guidance: isTooLargeForFullAnalysis
        ? LARGE_PDF_FULL_FILE_WARNING
        : undefined,
    },
  };
}

export async function saveDocumentPageSelectionsAction(
  projectId: string,
  input: SaveDocumentPageInput[]
): Promise<{ error?: string }> {
  const { profile } = await requireOrganisationProfile();
  if (input.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const documentIds = [...new Set(input.map((row) => row.documentId))];

  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .in("id", documentIds);

  if (docsError) {
    return { error: docsError.message };
  }

  const allowed = new Set((docs ?? []).map((row) => String((row as { id: string }).id)));
  const rows = input
    .filter((row) => allowed.has(row.documentId))
    .map((row) => ({
      organisation_id: profile.organisation_id,
      project_id: projectId,
      document_id: row.documentId,
      page_number: row.pageNumber,
      page_label: row.pageLabel?.trim() || null,
      page_type: row.pageType ?? null,
      include_in_analysis: row.includeInAnalysis ?? false,
      analysis_status: row.includeInAnalysis ? "selected" : "pending",
    }));

  if (rows.length === 0) {
    return { error: "No valid pages to save." };
  }

  const { error } = await supabase.from("document_pages").upsert(rows, {
    onConflict: "document_id,page_number",
  });

  if (error) {
    if (/column .+ does not exist/i.test(error.message)) {
      return {
        error:
          "Page preferences could not be saved yet. Run the latest database migration.",
      };
    }
    return { error: error.message };
  }

  revalidateProject(projectId);
  return {};
}

export async function analyseProjectDocumentsBatchAction(
  projectId: string,
  input: AnalyseProjectDocumentsInput
): Promise<
  AnalyseDocumentsResult & {
    selectedPageCount?: number;
    estimatedBatchBytes?: number;
    batchStatus?: "complete" | "failed" | "requires_page_selection";
  }
> {
  const { profile } = await requireOrganisationProfile();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      error: ANALYSIS_ERRORS.geminiKeyMissing,
      batchStatus: "failed",
    };
  }

  if (!input.documentId?.trim()) {
    return {
      error: ANALYSIS_ERRORS.noDocumentSelected,
      batchStatus: "failed",
    };
  }

  const doc = await fetchProjectDocument(
    projectId,
    profile.organisation_id,
    input.documentId
  );

  if (!doc) {
    return { error: ANALYSIS_ERRORS.noDocumentSelected, batchStatus: "failed" };
  }

  if (!isSupportedAnalysisMimeType(doc.file_type)) {
    return {
      error: ANALYSIS_ERRORS.unsupportedFileType,
      batchStatus: "failed",
    };
  }

  const storagePath = doc.storage_path?.trim();
  if (!storagePath) {
    return {
      error: ANALYSIS_ERRORS.storagePathMissing,
      batchStatus: "failed",
    };
  }

  const supabase = await createClient();
  const downloaded = await downloadDocumentBytes(supabase, storagePath);
  if ("error" in downloaded) {
    return { error: ANALYSIS_ERRORS.couldNotDownload, batchStatus: "failed" };
  }

  const mimeType = (doc.file_type || "application/pdf").toLowerCase();
  const isPdf = isPdfMimeType(mimeType);

  let pageCount: number | null = isPdf ? doc.page_count : 1;
  if (isPdf) {
    try {
      pageCount = await getPdfPageCount(downloaded.bytes);
    } catch {
      return {
        error: ANALYSIS_ERRORS.couldNotExtractPages,
        batchStatus: "failed",
      };
    }
  }

  const pageCountKnown = pageCount != null;
  const resolvedPageCount = pageCount ?? 0;

  const { getDocumentPagesForProject } = await import(
    "@/src/lib/documents/document-page-queries"
  );
  const documentPages: DocumentPage[] = await getDocumentPagesForProject(
    projectId,
    profile.organisation_id
  );

  const resolved = resolveSelectedPagesForAnalysis({
    body: {
      selectedPages: input.selectedPages,
      selected_pages: input.selected_pages,
      pageNumbers: input.pageNumbers,
      pageRangeInput: input.pageRangeInput,
      preset: input.preset,
    },
    isPdf,
    pageCount,
    pageCountKnown,
    documentPages,
    documentId: doc.id,
  });

  if (resolved.error && resolved.pages.length === 0) {
    return {
      error: resolved.error,
      batchStatus: "requires_page_selection",
    };
  }

  let selectedPages = resolved.pages;

  const isTooLargeForFullAnalysis =
    isPdf &&
    (downloaded.sizeBytes > MAX_ANALYSIS_BATCH_BYTES ||
      (pageCountKnown && resolvedPageCount > MAX_ANALYSIS_BATCH_PAGES));

  if (isPdf && isTooLargeForFullAnalysis && selectedPages.length === 0) {
    return {
      error: ANALYSIS_ERRORS.selectPagesForLargeFile,
      batchStatus: "requires_page_selection",
    };
  }

  if (selectedPages.length === 0 && isPdf) {
    if (pageCountKnown && resolvedPageCount <= MAX_ANALYSIS_BATCH_PAGES) {
      selectedPages = Array.from(
        { length: resolvedPageCount },
        (_, index) => index + 1
      );
    } else {
      return {
        error:
          "No pages selected. Choose one or more pages or enter a page range.",
        batchStatus: "requires_page_selection",
      };
    }
  }

  if (selectedPages.length === 0) {
    return {
      error:
        "No pages selected. Choose one or more pages or enter a page range.",
      batchStatus: "failed",
    };
  }

  if (selectedPages.length > MAX_ANALYSIS_BATCH_PAGES) {
    return {
      error: ANALYSIS_ERRORS.tooManyPages,
      batchStatus: "failed",
      selectedPageCount: selectedPages.length,
    };
  }

  if (
    pageCountKnown &&
    selectedPages.some((page) => page < 1 || page > resolvedPageCount)
  ) {
    return {
      error: ANALYSIS_ERRORS.pageRangeOutsideDocument,
      batchStatus: "failed",
    };
  }

  const estimatedBatchBytes = isPdf
    ? estimatePdfBatchBytes(
        downloaded.sizeBytes,
        resolvedPageCount || selectedPages.length,
        selectedPages.length
      )
    : downloaded.sizeBytes;

  if (!isPdf && downloaded.sizeBytes > MAX_ANALYSIS_BATCH_BYTES) {
    return {
      error: ANALYSIS_ERRORS.batchTooLarge,
      batchStatus: "failed",
      estimatedBatchBytes: downloaded.sizeBytes,
    };
  }

  await tryUpdateDocumentAnalysisStatus(
    supabase,
    doc.id,
    profile.organisation_id,
    projectId,
    "analysing"
  );

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
      console.error("[document-analysis] pdf_split_failed:", extractError);
      await tryUpdateDocumentAnalysisStatus(
        supabase,
        doc.id,
        profile.organisation_id,
        projectId,
        "analysis_failed"
      );
      const message =
        extractError instanceof Error &&
        extractError.message.includes("outside this document")
          ? ANALYSIS_ERRORS.pageRangeOutsideDocument
          : ANALYSIS_ERRORS.couldNotExtractPages;
      return {
        error: message,
        batchStatus: "failed",
      };
    }
  }

  if (payloadBytes.byteLength > MAX_ANALYSIS_BATCH_BYTES) {
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      profile.organisation_id,
      projectId,
      "analysis_failed"
    );
    return {
      error: ANALYSIS_ERRORS.batchTooLarge,
      batchStatus: "requires_page_selection",
      selectedPageCount: selectedPages.length,
      estimatedBatchBytes: payloadBytes.byteLength,
    };
  }

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
      profile.organisation_id,
      projectId,
      "analysis_failed"
    );
    return {
      error: userMessageForGeminiFailure(payloadValidation.code),
      batchStatus: "failed",
    };
  }

  const gemini = await callGeminiForPdfSuggestions({
    apiKey,
    tradeFocus: input.tradeFocus,
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
      profile.organisation_id,
      projectId,
      "analysis_failed"
    );
    await updateDocumentPagesAnalysisStatus(
      supabase,
      profile.organisation_id,
      projectId,
      doc.id,
      selectedPages,
      "failed"
    );
    return { error: gemini.error, batchStatus: "failed" };
  }

  if (gemini.parseFailed) {
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      profile.organisation_id,
      projectId,
      "analysis_failed"
    );
    return {
      error: ANALYSIS_ERRORS.geminiParseFailed,
      batchStatus: "failed",
    };
  }

  if (gemini.suggestions.length === 0) {
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      profile.organisation_id,
      projectId,
      "analysed"
    );
    await updateDocumentPagesAnalysisStatus(
      supabase,
      profile.organisation_id,
      projectId,
      doc.id,
      selectedPages,
      "analysed"
    );
    revalidateProject(projectId);
    return buildSuccessResult({
      createdCount: 0,
      analysedDocuments: [{ id: doc.id, fileName: doc.file_name }],
      pagesAnalysed: selectedPages.length,
      lowConfidenceCount: 0,
      selectedPageCount: selectedPages.length,
      estimatedBatchBytes: payloadBytes.byteLength,
      summaryMessage: ANALYSIS_ERRORS.emptySuggestions,
    });
  }

  const lowConfidenceCount = countLowConfidenceSuggestions(gemini.suggestions);

  const rows = gemini.suggestions.map((suggestion) => ({
    organisation_id: profile.organisation_id,
    project_id: projectId,
    status: "pending" as const,
    confidence: suggestion.confidence,
    trade: suggestion.trade || input.tradeFocus,
    description: suggestion.description,
    quantity: suggestion.quantity ?? 0,
    unit: suggestion.unit?.trim() || "each",
    reasoning: suggestion.reasoning ?? null,
    source_document_id: suggestion.source_document_id ?? doc.id,
    drawing_reference: suggestion.drawing_reference ?? null,
    sheet_number: suggestion.sheet_number ?? null,
    page_number: suggestion.page_number ?? null,
  }));

  const { error: insertError } = await supabase.from("ai_review_items").insert(rows);

  if (insertError) {
    await tryUpdateDocumentAnalysisStatus(
      supabase,
      doc.id,
      profile.organisation_id,
      projectId,
      "analysis_failed"
    );
    return { error: insertError.message, batchStatus: "failed" };
  }

  await tryUpdateDocumentAnalysisStatus(
    supabase,
    doc.id,
    profile.organisation_id,
    projectId,
    "analysed"
  );
  await updateDocumentPagesAnalysisStatus(
    supabase,
    profile.organisation_id,
    projectId,
    doc.id,
    selectedPages,
    "analysed"
  );

  revalidateProject(projectId);

  return buildSuccessResult({
    createdCount: rows.length,
    analysedDocuments: [{ id: doc.id, fileName: doc.file_name }],
    pagesAnalysed: selectedPages.length,
    lowConfidenceCount,
    selectedPageCount: selectedPages.length,
    estimatedBatchBytes: payloadBytes.byteLength,
  });
}

/** Analyse all small supported files (images and PDFs within limits). */
export async function analyseSmallProjectDocumentsAction(
  projectId: string,
  tradeFocus: AiReviewTradeFocus
): Promise<AnalyseDocumentsResult> {
  const { profile } = await requireOrganisationProfile();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return { error: ANALYSIS_ERRORS.geminiKeyMissing };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, organisation_id, project_id, file_name, storage_path, file_type, document_type, processing_status"
    )
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return { error: "No documents uploaded." };
  }

  const documents = data as unknown as Document[];
  const supported = documents.filter((doc) =>
    isSupportedAnalysisMimeType(doc.file_type)
  );

  if (supported.length === 0) {
    return { error: ANALYSIS_ERRORS.unsupportedFileType };
  }

  const base64Docs: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }> = [];

  const failedDocuments: AnalysisFailedDocument[] = [];
  let skippedLarge = false;

  for (const doc of supported.slice(0, 4)) {
    const storagePath = doc.storage_path?.trim();
    if (!storagePath) {
      failedDocuments.push({
        fileName: doc.file_name,
        reason: "Storage path missing. Re-upload this document.",
      });
      continue;
    }

    const downloaded = await downloadDocumentBytes(supabase, storagePath);
    if ("error" in downloaded) {
      failedDocuments.push({
        fileName: doc.file_name,
        reason: "Storage download failed.",
      });
      continue;
    }

    const mimeType = (doc.file_type || "application/pdf").toLowerCase();

    if (isPdfMimeType(mimeType)) {
      let pageCount = 0;
      try {
        pageCount = await getPdfPageCount(downloaded.bytes);
      } catch {
        failedDocuments.push({
          fileName: doc.file_name,
          reason: "Could not read PDF pages.",
        });
        continue;
      }

      if (
        downloaded.sizeBytes > MAX_ANALYSIS_BATCH_BYTES ||
        pageCount > MAX_ANALYSIS_BATCH_PAGES
      ) {
        skippedLarge = true;
        failedDocuments.push({
          fileName: doc.file_name,
          reason: "Too large for automatic batch — select pages.",
        });
        continue;
      }
    } else if (downloaded.sizeBytes > MAX_ANALYSIS_BATCH_BYTES) {
      failedDocuments.push({
        fileName: doc.file_name,
        reason: "Image exceeds 25 MB batch limit.",
      });
      continue;
    }

    base64Docs.push({
      id: doc.id,
      fileName: doc.file_name,
      mimeType,
      base64: downloaded.bytes.toString("base64"),
    });
  }

  if (base64Docs.length === 0) {
    if (skippedLarge) {
      return {
        error: ANALYSIS_ERRORS.selectPagesForLargeFile,
        failedDocuments,
        batchStatus: "requires_page_selection",
      };
    }
    return {
      error: "No documents could be prepared for analysis.",
      failedDocuments,
    };
  }

  const { callGeminiForPdfSuggestions } = await import(
    "@/src/lib/ai-review/document-analysis/gemini"
  );

  const primaryDoc = base64Docs[0]!;
  const totalBytes = base64Docs.reduce(
    (sum, item) => sum + Buffer.byteLength(item.base64, "base64"),
    0
  );

  const gemini = await callGeminiForPdfSuggestions({
    apiKey,
    tradeFocus,
    documents: base64Docs,
    logContext: {
      documentId: primaryDoc.id,
      fileName: primaryDoc.fileName,
      miniPdfBytes: totalBytes,
      selectedPagesCount: base64Docs.length,
      geminiApiKeyPresent: Boolean(apiKey),
    },
  });

  if (gemini.error) {
    return { error: gemini.error };
  }

  if (gemini.parseFailed) {
    return { error: ANALYSIS_ERRORS.geminiParseFailed };
  }

  if (gemini.suggestions.length === 0) {
    revalidateProject(projectId);
    return buildSuccessResult({
      createdCount: 0,
      analysedDocuments: base64Docs.map((d) => ({
        id: d.id,
        fileName: d.fileName,
      })),
      pagesAnalysed: base64Docs.length,
      lowConfidenceCount: 0,
      failedDocuments,
      summaryMessage: ANALYSIS_ERRORS.emptySuggestions,
    });
  }

  const lowConfidenceCount = countLowConfidenceSuggestions(gemini.suggestions);

  const rows = gemini.suggestions.map((suggestion) => ({
    organisation_id: profile.organisation_id,
    project_id: projectId,
    status: "pending" as const,
    confidence: suggestion.confidence,
    trade: suggestion.trade || tradeFocus,
    description: suggestion.description,
    quantity: suggestion.quantity ?? 0,
    unit: suggestion.unit?.trim() || "each",
    reasoning: suggestion.reasoning ?? null,
    source_document_id: suggestion.source_document_id ?? null,
    drawing_reference: suggestion.drawing_reference ?? null,
    sheet_number: suggestion.sheet_number ?? null,
    page_number: suggestion.page_number ?? null,
  }));

  const { error: insertError } = await supabase.from("ai_review_items").insert(rows);
  if (insertError) {
    return { error: insertError.message };
  }

  revalidateProject(projectId);
  return buildSuccessResult({
    createdCount: rows.length,
    analysedDocuments: base64Docs.map((d) => ({ id: d.id, fileName: d.fileName })),
    pagesAnalysed: base64Docs.length,
    lowConfidenceCount,
    failedDocuments,
  });
}
