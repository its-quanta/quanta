export type AiReviewTradeFocus =
  | "Carpentry"
  | "Partitions"
  | "Ceilings"
  | "Demolition"
  | "Flooring"
  | "Joinery"
  | "General";

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
