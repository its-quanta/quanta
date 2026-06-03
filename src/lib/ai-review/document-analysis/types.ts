export type AiReviewTradeFocus =
  | "Carpentry"
  | "Partitions"
  | "Ceilings"
  | "Demolition"
  | "Flooring"
  | "Joinery"
  | "General";

/** How Gemini interprets drawing pages when proposing draft review items. */
export type DocumentAnalysisMode = "scope_discovery" | "quantity_takeoff";

export const DEFAULT_DOCUMENT_ANALYSIS_MODE: DocumentAnalysisMode =
  "scope_discovery";

export function normalizeDocumentAnalysisMode(
  value: string | undefined | null
): DocumentAnalysisMode {
  return value === "quantity_takeoff" ? "quantity_takeoff" : "scope_discovery";
}

export const DOCUMENT_ANALYSIS_MODE_LABELS: Record<DocumentAnalysisMode, string> =
  {
    scope_discovery: "Scope discovery",
    quantity_takeoff: "Quantity takeoff",
  };

export type AnalysisFailedDocument = {
  fileName: string;
  reason: string;
};

export type AnalyseDocumentsResult = {
  error?: string;
  createdCount?: number;
  analysedDocuments?: { id: string; fileName: string }[];
  selectedPageCount?: number;
  pagesAnalysed?: number;
  estimatedBatchBytes?: number;
  batchStatus?: "complete" | "failed" | "requires_page_selection";
  lowConfidenceCount?: number;
  failedDocuments?: AnalysisFailedDocument[];
  summaryMessage?: string;
};
