export type AnalysisStageStatus = "pending" | "in_progress" | "complete" | "failed";

export type AnalysisStageId =
  | "prepare"
  | "extract"
  | "send"
  | "analyse"
  | "save"
  | "complete";

export type AnalysisStageDefinition = {
  id: AnalysisStageId;
  label: string;
  percent: number;
};

export const ANALYSIS_PROGRESS_STAGES: AnalysisStageDefinition[] = [
  { id: "prepare", label: "Preparing document", percent: 0 },
  { id: "extract", label: "Extracting selected pages", percent: 20 },
  { id: "send", label: "Sending selected pages to Gemini", percent: 40 },
  { id: "analyse", label: "Analysing content", percent: 65 },
  { id: "save", label: "Saving review suggestions", percent: 85 },
  { id: "complete", label: "Complete", percent: 100 },
];

export type AnalysisStageState = {
  id: AnalysisStageId;
  label: string;
  percent: number;
  status: AnalysisStageStatus;
};

export function createInitialStageStates(): AnalysisStageState[] {
  return ANALYSIS_PROGRESS_STAGES.map((stage, index) => ({
    ...stage,
    status: index === 0 ? "in_progress" : "pending",
  }));
}

export function advanceSimulatedStages(
  stages: AnalysisStageState[],
  activeIndex: number
): AnalysisStageState[] {
  return stages.map((stage, index) => {
    if (index < activeIndex) {
      return { ...stage, status: "complete" };
    }
    if (index === activeIndex) {
      return { ...stage, status: "in_progress" };
    }
    return { ...stage, status: "pending" };
  });
}

export function completeAllStages(
  stages: AnalysisStageState[]
): AnalysisStageState[] {
  return stages.map((stage) => ({ ...stage, status: "complete" as const }));
}

export function failStagesAt(
  stages: AnalysisStageState[],
  failedIndex: number
): AnalysisStageState[] {
  return stages.map((stage, index) => {
    if (index < failedIndex) {
      return { ...stage, status: "complete" };
    }
    if (index === failedIndex) {
      return { ...stage, status: "failed" };
    }
    return { ...stage, status: "pending" };
  });
}

export function currentProgressPercent(stages: AnalysisStageState[]): number {
  const inProgress = stages.find((s) => s.status === "in_progress");
  if (inProgress) {
    return inProgress.percent;
  }
  const lastComplete = [...stages]
    .reverse()
    .find((s) => s.status === "complete");
  return lastComplete?.percent ?? 0;
}

export const SIMULATED_STAGE_INTERVAL_MS = 1_200;

export const SIMULATED_MAX_STAGE_INDEX =
  ANALYSIS_PROGRESS_STAGES.length - 2;
