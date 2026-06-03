import { mapAnalysisError, type AnalysisErrorCode } from "@/src/lib/ai-review/document-analysis/analysis-errors";

export function errorReferenceFromMessage(message: string): string {
  const mapped = mapAnalysisError(message);
  return errorReferenceFromCode(mapped.code);
}

export function errorReferenceFromCode(code: AnalysisErrorCode): string {
  switch (code) {
    case "gemini_key_missing":
      return "gemini_key_missing";
    case "gemini_key_invalid":
      return "gemini_key_invalid";
    case "gemini_model_unavailable":
      return "gemini_model_unavailable";
    case "gemini_timeout":
      return "gemini_timeout";
    case "gemini_parse_failed":
      return "gemini_parse_failed";
    case "pdf_not_prepared":
    case "extract_failed":
      return "pdf_extraction_failed";
    case "no_pages_selected":
    case "page_range_invalid":
    case "too_many_pages":
      return "selected_pages_invalid";
    case "storage_download_failed":
      return "upload_failed";
    case "document_too_large":
      return "batch_too_large";
    case "gemini_format_rejected":
      return "gemini_format_rejected";
    case "gemini_analysis_failed":
      return "analysis_failed";
    case "suggestions_save_failed":
      return "suggestions_save_failed";
    case "analysis_session_expired":
      return "analysis_session_expired";
    default:
      return "analysis_failed";
  }
}
