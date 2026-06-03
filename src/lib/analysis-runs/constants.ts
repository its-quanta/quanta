export const ANALYSIS_RUN_POLL_INTERVAL_MS = 3_000;

export type AnalysisRunStatus = "queued" | "processing" | "completed" | "failed";

/** Values stored in analysis_runs.current_stage */
export const ANALYSIS_RUN_STAGE = {
  queued: "Queued",
  preparing: "Preparing analysis",
  extracting: "Extracting selected pages",
  sending: "Sending to Gemini",
  generating: "Generating suggestions",
  saving: "Saving review items",
  complete: "Complete",
  completeWithPageMetadataWarning:
    "Analysis completed with page metadata warning",
} as const;

export type AnalysisRunStageLabel =
  (typeof ANALYSIS_RUN_STAGE)[keyof typeof ANALYSIS_RUN_STAGE];

export const ANALYSIS_RUN_STAGE_PROGRESS: Record<AnalysisRunStageLabel, number> =
  {
    [ANALYSIS_RUN_STAGE.queued]: 0,
    [ANALYSIS_RUN_STAGE.preparing]: 10,
    [ANALYSIS_RUN_STAGE.extracting]: 30,
    [ANALYSIS_RUN_STAGE.sending]: 50,
    [ANALYSIS_RUN_STAGE.generating]: 70,
    [ANALYSIS_RUN_STAGE.saving]: 90,
    [ANALYSIS_RUN_STAGE.complete]: 100,
    [ANALYSIS_RUN_STAGE.completeWithPageMetadataWarning]: 100,
  };

/** Ordered stages shown in the progress UI (excludes terminal Complete). */
export const ANALYSIS_RUN_UI_STAGE_ORDER: AnalysisRunStageLabel[] = [
  ANALYSIS_RUN_STAGE.queued,
  ANALYSIS_RUN_STAGE.preparing,
  ANALYSIS_RUN_STAGE.extracting,
  ANALYSIS_RUN_STAGE.sending,
  ANALYSIS_RUN_STAGE.generating,
  ANALYSIS_RUN_STAGE.saving,
];

export const ANALYSIS_RUN_COLUMNS =
  "id, organisation_id, project_id, status, progress, current_stage, documents_total, documents_completed, pages_total, pages_completed, error_message, error_reference, started_at, completed_at, created_by, created_at, updated_at" as const;
