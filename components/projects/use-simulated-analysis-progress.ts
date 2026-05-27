"use client";

import { useCallback, useRef, useState } from "react";

import {
  mapAnalysisError,
  type AnalysisErrorCode,
} from "@/src/lib/ai-review/document-analysis/analysis-errors";
import {
  advanceSimulatedStages,
  completeAllStages,
  createInitialStageStates,
  currentProgressPercent,
  failStagesAt,
  SIMULATED_MAX_STAGE_INDEX,
  SIMULATED_STAGE_INTERVAL_MS,
  type AnalysisStageState,
} from "@/src/lib/ai-review/document-analysis/analysis-stages";
import type { AnalyseDocumentsResult } from "@/src/lib/ai-review/document-analysis/types";

export type AnalysisRunPhase = "idle" | "running" | "complete" | "failed";

export function useSimulatedAnalysisProgress() {
  const [runPhase, setRunPhase] = useState<AnalysisRunPhase>("idle");
  const [stages, setStages] = useState<AnalysisStageState[]>(() =>
    createInitialStageStates()
  );
  const [result, setResult] = useState<AnalyseDocumentsResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AnalysisErrorCode | null>(null);
  const stageIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stageIndexRef.current = 0;
    setRunPhase("idle");
    setStages(createInitialStageStates());
    setResult(null);
    setErrorMessage(null);
    setErrorCode(null);
  }, [clearTimer]);

  const run = useCallback(
    async (
      request: () => Promise<AnalyseDocumentsResult>
    ): Promise<AnalyseDocumentsResult> => {
      clearTimer();
      stageIndexRef.current = 0;
      setRunPhase("running");
      setStages(createInitialStageStates());
      setResult(null);
      setErrorMessage(null);
      setErrorCode(null);

      timerRef.current = setInterval(() => {
        stageIndexRef.current = Math.min(
          stageIndexRef.current + 1,
          SIMULATED_MAX_STAGE_INDEX
        );
        setStages((current) =>
          advanceSimulatedStages(current, stageIndexRef.current)
        );
      }, SIMULATED_STAGE_INTERVAL_MS);

      try {
        const response = await request();
        clearTimer();

        if (response.error) {
          const mapped = mapAnalysisError(response.error, response.batchStatus);
          setErrorMessage(mapped.message);
          setErrorCode(mapped.code);
          setStages((current) =>
            failStagesAt(current, stageIndexRef.current)
          );
          setRunPhase("failed");
          return response;
        }

        setStages(completeAllStages(createInitialStageStates()));
        setResult(response);
        setRunPhase("complete");
        return response;
      } catch {
        clearTimer();
        const mapped = mapAnalysisError("Analysis could not be completed.");
        setErrorMessage(mapped.message);
        setErrorCode(mapped.code);
        setStages((current) => failStagesAt(current, stageIndexRef.current));
        setRunPhase("failed");
        return { error: mapped.message, batchStatus: "failed" };
      }
    },
    [clearTimer]
  );

  const progressPercent = currentProgressPercent(stages);

  return {
    runPhase,
    stages,
    progressPercent,
    result,
    errorMessage,
    errorCode,
    run,
    reset,
    isRunning: runPhase === "running",
  };
}
