import type { AnalyseProjectDocumentsInput } from "@/src/lib/ai-review/document-analysis/actions";
import {
  MAX_ANALYSIS_BATCH_BYTES,
  MAX_ANALYSIS_BATCH_PAGES,
  SUPPORTED_ANALYSIS_MIME_TYPES,
} from "@/src/lib/ai-review/document-analysis/constants";
import {
  downloadDocumentBytes,
  fetchProjectDocument,
} from "@/src/lib/ai-review/document-analysis/document-analysis-db";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import {
  estimatePdfBatchBytes,
} from "@/src/lib/ai-review/document-analysis/page-selection";
import { getPdfPageCount, isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import { resolveSelectedPagesForAnalysis } from "@/src/lib/ai-review/document-analysis/resolve-selected-pages";
import { createClient } from "@/src/lib/supabase/server";
import type { DocumentPage } from "@/src/types/database";

function isSupportedAnalysisMimeType(mimeType: string | null | undefined): boolean {
  const type = (mimeType ?? "").toLowerCase();
  return (SUPPORTED_ANALYSIS_MIME_TYPES as readonly string[]).includes(type);
}

export type ValidatedAnalysisRunInput = {
  documentId: string;
  fileName: string;
  tradeFocus: AnalyseProjectDocumentsInput["tradeFocus"];
  selectedPages: number[];
  isPdf: boolean;
  estimatedBatchBytes: number;
};

export async function validateAnalysisRunInput(
  projectId: string,
  organisationId: string,
  input: AnalyseProjectDocumentsInput,
  documentPages: DocumentPage[]
): Promise<
  | { ok: true; data: ValidatedAnalysisRunInput }
  | { ok: false; error: string; batchStatus?: "failed" | "requires_page_selection" }
> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return { ok: false, error: ANALYSIS_ERRORS.geminiKeyMissing, batchStatus: "failed" };
  }

  if (!input.documentId?.trim()) {
    return { ok: false, error: ANALYSIS_ERRORS.noDocumentSelected, batchStatus: "failed" };
  }

  const doc = await fetchProjectDocument(
    projectId,
    organisationId,
    input.documentId
  );

  if (!doc) {
    return { ok: false, error: ANALYSIS_ERRORS.noDocumentSelected, batchStatus: "failed" };
  }

  if (!isSupportedAnalysisMimeType(doc.file_type)) {
    return { ok: false, error: ANALYSIS_ERRORS.unsupportedFileType, batchStatus: "failed" };
  }

  const storagePath = doc.storage_path?.trim();
  if (!storagePath) {
    return { ok: false, error: ANALYSIS_ERRORS.storagePathMissing, batchStatus: "failed" };
  }

  const supabase = await createClient();
  const downloaded = await downloadDocumentBytes(supabase, storagePath);
  if ("error" in downloaded) {
    return { ok: false, error: downloaded.error, batchStatus: "failed" };
  }

  const mimeType = (doc.file_type || "application/pdf").toLowerCase();
  const isPdf = isPdfMimeType(mimeType);

  let pageCount: number | null = isPdf ? doc.page_count : 1;
  if (isPdf) {
    try {
      pageCount = await getPdfPageCount(downloaded.bytes);
    } catch {
      return {
        ok: false,
        error: ANALYSIS_ERRORS.pdfExtractionFailed,
        batchStatus: "failed",
      };
    }
  }

  const pageCountKnown = pageCount != null;
  const resolvedPageCount = pageCount ?? 0;

  const selectedPagesFromInput =
    input.selectedPages ?? input.selected_pages ?? [];

  const resolved = resolveSelectedPagesForAnalysis({
    body: {
      selectedPages: selectedPagesFromInput,
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
      ok: false,
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
      ok: false,
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
        ok: false,
        error: ANALYSIS_ERRORS.noPagesSelected,
        batchStatus: "requires_page_selection",
      };
    }
  }

  if (selectedPages.length === 0) {
    return {
      ok: false,
      error: ANALYSIS_ERRORS.noPagesSelected,
      batchStatus: "failed",
    };
  }

  if (selectedPages.length > MAX_ANALYSIS_BATCH_PAGES) {
    return { ok: false, error: ANALYSIS_ERRORS.tooManyPages, batchStatus: "failed" };
  }

  if (
    pageCountKnown &&
    selectedPages.some((page) => page < 1 || page > resolvedPageCount)
  ) {
    return {
      ok: false,
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
    return { ok: false, error: ANALYSIS_ERRORS.batchTooLarge, batchStatus: "failed" };
  }

  if (isPdf && estimatedBatchBytes > MAX_ANALYSIS_BATCH_BYTES) {
    return {
      ok: false,
      error: ANALYSIS_ERRORS.batchTooLarge,
      batchStatus: "requires_page_selection",
    };
  }

  return {
    ok: true,
    data: {
      documentId: doc.id,
      fileName: doc.file_name,
      tradeFocus: input.tradeFocus,
      selectedPages,
      isPdf,
      estimatedBatchBytes,
    },
  };
}
