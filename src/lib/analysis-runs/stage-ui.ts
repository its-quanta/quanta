import {
  ANALYSIS_RUN_STAGE,
  ANALYSIS_RUN_STAGE_PROGRESS,
  ANALYSIS_RUN_UI_STAGE_ORDER,
  type AnalysisRunStageLabel,
} from "@/src/lib/analysis-runs/constants";
import type { AnalysisRunStatusSnapshot } from "@/src/lib/analysis-runs/types";
import type {
  AnalysisStageState,
  AnalysisStageStatus,
} from "@/src/lib/ai-review/document-analysis/analysis-stages";

function stageIndex(stage: string): number {
  const idx = ANALYSIS_RUN_UI_STAGE_ORDER.indexOf(stage as AnalysisRunStageLabel);
  if (idx >= 0) {
    return idx;
  }
  const progressEntries = Object.entries(ANALYSIS_RUN_STAGE_PROGRESS);
  for (let i = 0; i < progressEntries.length; i++) {
    if (progressEntries[i]?.[0] === stage) {
      return i;
    }
  }
  return 0;
}

function statusForStage(
  currentStage: string,
  stage: AnalysisRunStageLabel,
  runStatus: AnalysisRunStatusSnapshot["status"]
): AnalysisStageStatus {
  const currentIndex = stageIndex(currentStage);
  const stageIdx = ANALYSIS_RUN_UI_STAGE_ORDER.indexOf(stage);

  if (runStatus === "failed" && stageIdx === currentIndex) {
    return "failed";
  }

  if (runStatus === "completed") {
    return "complete";
  }

  if (stageIdx < currentIndex) {
    return "complete";
  }

  if (stageIdx === currentIndex) {
    return runStatus === "queued" ? "pending" : "in_progress";
  }

  return "pending";
}

/** Map polled analysis run to progress UI stages. */
export function stagesFromAnalysisRun(
  snapshot: AnalysisRunStatusSnapshot
): AnalysisStageState[] {
  return ANALYSIS_RUN_UI_STAGE_ORDER.map((label) => ({
    id: label,
    label,
    percent:
      ANALYSIS_RUN_STAGE_PROGRESS[label] ??
      ANALYSIS_RUN_STAGE_PROGRESS[ANALYSIS_RUN_STAGE.preparing],
    status: statusForStage(snapshot.currentStage, label, snapshot.status),
  }));
}

export function progressPercentFromRun(
  snapshot: AnalysisRunStatusSnapshot
): number {
  if (snapshot.status === "completed") {
    return 100;
  }
  const fromStage =
    ANALYSIS_RUN_STAGE_PROGRESS[
      snapshot.currentStage as AnalysisRunStageLabel
    ];
  return fromStage ?? snapshot.progress;
}
