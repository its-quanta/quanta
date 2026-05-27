import { resolveConfidenceLevel } from "@/src/lib/ai-review/constants";
import type {
  AnalysisFailedDocument,
  AnalyseDocumentsResult,
} from "@/src/lib/ai-review/document-analysis/types";

type SuggestionWithConfidence = { confidence?: number | null };

export function countLowConfidenceSuggestions(
  suggestions: SuggestionWithConfidence[]
): number {
  return suggestions.filter((item) => {
    const level = resolveConfidenceLevel(item.confidence ?? null);
    return level === "low" || level === null;
  }).length;
}

export function buildSuccessResult(input: {
  createdCount: number;
  analysedDocuments: { id: string; fileName: string }[];
  pagesAnalysed: number;
  lowConfidenceCount: number;
  failedDocuments?: AnalysisFailedDocument[];
  estimatedBatchBytes?: number;
  selectedPageCount?: number;
  summaryMessage?: string;
}): AnalyseDocumentsResult {
  return {
    createdCount: input.createdCount,
    analysedDocuments: input.analysedDocuments,
    pagesAnalysed: input.pagesAnalysed,
    lowConfidenceCount: input.lowConfidenceCount,
    failedDocuments: input.failedDocuments?.length
      ? input.failedDocuments
      : undefined,
    estimatedBatchBytes: input.estimatedBatchBytes,
    selectedPageCount: input.selectedPageCount,
    summaryMessage: input.summaryMessage,
    batchStatus: "complete",
  };
}
