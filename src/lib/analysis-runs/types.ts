import type { AnalyseProjectDocumentsInput } from "@/src/lib/ai-review/document-analysis/actions";
import type { AnalyseDocumentsResult } from "@/src/lib/ai-review/document-analysis/types";
import type {
  AnalysisRunStageLabel,
  AnalysisRunStatus,
} from "@/src/lib/analysis-runs/constants";

export type AnalysisRunInputPayload = AnalyseProjectDocumentsInput & {
  /** Resolved 1-based pages at job creation (PDF). */
  resolvedSelectedPages?: number[];
};

export type AnalysisRunRow = {
  id: string;
  organisation_id: string;
  project_id: string;
  status: AnalysisRunStatus;
  progress: number;
  current_stage: string;
  documents_total: number;
  documents_completed: number;
  pages_total: number;
  pages_completed: number;
  error_message: string | null;
  error_reference: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalysisRunStatusSnapshot = {
  runId: string;
  status: AnalysisRunStatus;
  progress: number;
  currentStage: string;
  stageLabel: string;
  documentsTotal: number;
  documentsCompleted: number;
  pagesTotal: number;
  pagesCompleted: number;
  errorMessage: string | null;
  errorReference: string | null;
  result: AnalyseDocumentsResult | null;
};

export function stageLabelFromRow(stage: string): AnalysisRunStageLabel | string {
  return stage;
}
