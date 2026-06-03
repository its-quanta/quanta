"use client";

import { memo } from "react";

import { DocumentAnalysisProgressCard } from "@/components/projects/document-analysis-progress-card";
import type { AnalysisRunPhase } from "@/components/projects/use-analysis-run-polling";
import type { AnalysisErrorCode } from "@/src/lib/ai-review/document-analysis/analysis-errors";
import type { AnalysisStageState } from "@/src/lib/ai-review/document-analysis/analysis-stages";
import type { AnalyseDocumentsResult } from "@/src/lib/ai-review/document-analysis/types";

type DocumentAnalysisStatusPanelProps = {
  projectId: string;
  phase: AnalysisRunPhase;
  stages: AnalysisStageState[];
  progressPercent: number;
  result: AnalyseDocumentsResult | null;
  errorMessage: string | null;
  errorCode: AnalysisErrorCode | null;
  onDismiss: () => void;
};

function DocumentAnalysisStatusPanelInner({
  projectId,
  phase,
  stages,
  progressPercent,
  result,
  errorMessage,
  errorCode,
  onDismiss,
}: DocumentAnalysisStatusPanelProps) {
  if (phase === "idle") {
    return null;
  }

  const runPhase =
    phase === "running" ? "running" : phase === "complete" ? "complete" : "failed";

  return (
    <DocumentAnalysisProgressCard
      projectId={projectId}
      stages={stages}
      progressPercent={progressPercent}
      runPhase={runPhase}
      result={result}
      errorMessage={errorMessage}
      errorCode={errorCode}
      onDismiss={onDismiss}
    />
  );
}

export const DocumentAnalysisStatusPanel = memo(DocumentAnalysisStatusPanelInner);
