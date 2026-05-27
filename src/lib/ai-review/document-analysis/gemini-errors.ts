import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";

export type GeminiFailureCode =
  | "key_missing"
  | "key_invalid"
  | "model_unavailable"
  | "pdf_not_prepared"
  | "batch_empty"
  | "format_rejected"
  | "timeout"
  | "parse_failed"
  | "generic_failed";

export function userMessageForGeminiFailure(code: GeminiFailureCode): string {
  switch (code) {
    case "key_missing":
      return ANALYSIS_ERRORS.geminiKeyMissing;
    case "key_invalid":
      return ANALYSIS_ERRORS.geminiKeyInvalid;
    case "model_unavailable":
      return ANALYSIS_ERRORS.geminiModelUnavailable;
    case "pdf_not_prepared":
      return ANALYSIS_ERRORS.pdfNotPrepared;
    case "batch_empty":
      return ANALYSIS_ERRORS.batchEmpty;
    case "format_rejected":
      return ANALYSIS_ERRORS.geminiFormatRejected;
    case "timeout":
      return ANALYSIS_ERRORS.geminiTimeout;
    case "parse_failed":
      return ANALYSIS_ERRORS.geminiParseFailed;
    case "generic_failed":
    default:
      return ANALYSIS_ERRORS.geminiAnalysisFailedWithLogs;
  }
}

export function classifyGeminiHttpFailure(
  status: number,
  responseBody: string
): GeminiFailureCode {
  const body = responseBody.toLowerCase();

  if (status === 401 || status === 403) {
    return "key_invalid";
  }

  if (
    status === 404 ||
    (body.includes("not found") && body.includes("model"))
  ) {
    return "model_unavailable";
  }

  if (
    status === 400 &&
    (body.includes("mime") ||
      body.includes("unsupported") ||
      body.includes("invalid argument") ||
      body.includes("document"))
  ) {
    return "format_rejected";
  }

  if (status === 408 || status === 504) {
    return "timeout";
  }

  return "generic_failed";
}
