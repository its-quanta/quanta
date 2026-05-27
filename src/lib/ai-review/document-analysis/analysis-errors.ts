import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";

export type AnalysisErrorCode =
  | "no_document_selected"
  | "no_pages_selected"
  | "too_many_pages"
  | "gemini_key_missing"
  | "gemini_key_invalid"
  | "gemini_model_unavailable"
  | "document_too_large"
  | "storage_download_failed"
  | "storage_path_missing"
  | "unsupported_file_type"
  | "extract_failed"
  | "page_range_invalid"
  | "pdf_not_prepared"
  | "batch_empty"
  | "gemini_format_rejected"
  | "gemini_timeout"
  | "gemini_parse_failed"
  | "gemini_analysis_failed"
  | "unknown";

const EXACT_MESSAGES: Array<[string, AnalysisErrorCode]> = [
  [ANALYSIS_ERRORS.noDocumentSelected, "no_document_selected"],
  [ANALYSIS_ERRORS.noPagesSelected, "no_pages_selected"],
  [ANALYSIS_ERRORS.tooManyPages, "too_many_pages"],
  [ANALYSIS_ERRORS.geminiKeyMissing, "gemini_key_missing"],
  [ANALYSIS_ERRORS.geminiKeyInvalid, "gemini_key_invalid"],
  [ANALYSIS_ERRORS.geminiModelUnavailable, "gemini_model_unavailable"],
  [ANALYSIS_ERRORS.pdfNotPrepared, "pdf_not_prepared"],
  [ANALYSIS_ERRORS.batchEmpty, "batch_empty"],
  [ANALYSIS_ERRORS.geminiFormatRejected, "gemini_format_rejected"],
  [ANALYSIS_ERRORS.geminiTimeout, "gemini_timeout"],
  [ANALYSIS_ERRORS.geminiParseFailed, "gemini_parse_failed"],
  [ANALYSIS_ERRORS.geminiAnalysisFailedWithLogs, "gemini_analysis_failed"],
  [ANALYSIS_ERRORS.batchTooLarge, "document_too_large"],
  [ANALYSIS_ERRORS.selectPagesForLargeFile, "document_too_large"],
  [ANALYSIS_ERRORS.couldNotDownload, "storage_download_failed"],
  [ANALYSIS_ERRORS.storagePathMissing, "storage_path_missing"],
  [ANALYSIS_ERRORS.unsupportedFileType, "unsupported_file_type"],
  [ANALYSIS_ERRORS.couldNotExtractPages, "extract_failed"],
  [ANALYSIS_ERRORS.pageRangeOutsideDocument, "page_range_invalid"],
];

export function mapAnalysisError(
  error: string | undefined,
  batchStatus?: string
): { code: AnalysisErrorCode; message: string } {
  if (!error?.trim()) {
    if (batchStatus === "requires_page_selection") {
      return {
        code: "no_pages_selected",
        message: ANALYSIS_ERRORS.noPagesSelected,
      };
    }
    return {
      code: "unknown",
      message: ANALYSIS_ERRORS.geminiAnalysisFailedWithLogs,
    };
  }

  for (const [message, code] of EXACT_MESSAGES) {
    if (error === message) {
      return { code, message: error };
    }
  }

  const text = error.toLowerCase();

  if (text.includes("timed out")) {
    return { code: "gemini_timeout", message: ANALYSIS_ERRORS.geminiTimeout };
  }

  if (text.includes("could not be parsed")) {
    return {
      code: "gemini_parse_failed",
      message: ANALYSIS_ERRORS.geminiParseFailed,
    };
  }

  if (text.includes("no pages selected") || batchStatus === "requires_page_selection") {
    return { code: "no_pages_selected", message: error };
  }

  if (text.includes("outside this document")) {
    return {
      code: "page_range_invalid",
      message: ANALYSIS_ERRORS.pageRangeOutsideDocument,
    };
  }

  if (text.includes("gemini analysis failed")) {
    return {
      code: "gemini_analysis_failed",
      message: error,
    };
  }

  return { code: "unknown", message: error };
}
