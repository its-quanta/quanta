"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getActiveAnalysisRunForProjectAction,
  getAnalysisRunStatusAction,
} from "@/src/lib/analysis-runs/actions";
import { ANALYSIS_RUN_POLL_INTERVAL_MS } from "@/src/lib/analysis-runs/constants";
import {
  progressPercentFromRun,
  stagesFromAnalysisRun,
} from "@/src/lib/analysis-runs/stage-ui";
import type { AnalysisRunStatusSnapshot } from "@/src/lib/analysis-runs/types";
import {
  mapAnalysisError,
  resolveAnalysisErrorDisplay,
  type AnalysisErrorCode,
} from "@/src/lib/ai-review/document-analysis/analysis-errors";
import type { AnalysisStageState } from "@/src/lib/ai-review/document-analysis/analysis-stages";
import type { AnalyseDocumentsResult } from "@/src/lib/ai-review/document-analysis/types";

export type AnalysisRunPhase = "idle" | "running" | "complete" | "failed";

export function useAnalysisRunPolling(projectId: string) {
  const [runId, setRunId] = useState<string | null>(null);
  const [phase, setPhase] = useState<AnalysisRunPhase>("idle");
  const [snapshot, setSnapshot] = useState<AnalysisRunStatusSnapshot | null>(
    null
  );
  const [stages, setStages] = useState<AnalysisStageState[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<AnalyseDocumentsResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AnalysisErrorCode | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applySnapshot = useCallback((next: AnalysisRunStatusSnapshot) => {
    setSnapshot(next);
    setStages(stagesFromAnalysisRun(next));
    setProgressPercent(progressPercentFromRun(next));

    if (next.status === "completed") {
      setResult(next.result);
      setErrorMessage(null);
      setErrorCode(null);
      setPhase("complete");
      return;
    }

    if (next.status === "failed") {
      const mapped = resolveAnalysisErrorDisplay({
        errorMessage: next.errorMessage,
        errorReference: next.errorReference,
        batchStatus: "failed",
      });
      setResult(null);
      setErrorMessage(mapped.message);
      setErrorCode(mapped.code);
      setPhase("failed");
      return;
    }

    setPhase("running");
  }, []);

  const pollOnce = useCallback(async (activeRunId: string) => {
    const response = await getAnalysisRunStatusAction(projectId, activeRunId);

    if ("error" in response) {
      const mapped = mapAnalysisError(response.error);
      setErrorMessage(mapped.message);
      setErrorCode(mapped.code);
      setPhase("failed");
      clearPollTimer();
      return;
    }

    applySnapshot(response.snapshot);
    if (
      response.snapshot.status === "completed" ||
      response.snapshot.status === "failed"
    ) {
      clearPollTimer();
    }
  }, [applySnapshot, clearPollTimer, projectId]);

  const startPolling = useCallback(
    (activeRunId: string) => {
      clearPollTimer();
      setRunId(activeRunId);
      setPhase("running");
      setResult(null);
      setErrorMessage(null);
      setErrorCode(null);
      void pollOnce(activeRunId);
      pollTimerRef.current = setInterval(() => {
        void pollOnce(activeRunId);
      }, ANALYSIS_RUN_POLL_INTERVAL_MS);
    },
    [clearPollTimer, pollOnce]
  );

  const reset = useCallback(() => {
    clearPollTimer();
    setRunId(null);
    setSnapshot(null);
    setStages([]);
    setProgressPercent(0);
    setResult(null);
    setErrorMessage(null);
    setErrorCode(null);
    setPhase("idle");
    setIsStarting(false);
  }, [clearPollTimer]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const active = await getActiveAnalysisRunForProjectAction(projectId);
      if (cancelled || !active.snapshot) {
        return;
      }

      applySnapshot(active.snapshot);
      setRunId(active.snapshot.runId);

      if (
        active.snapshot.status === "queued" ||
        active.snapshot.status === "processing"
      ) {
        startPolling(active.snapshot.runId);
      }
    })();

    return () => {
      cancelled = true;
      clearPollTimer();
    };
  }, [applySnapshot, clearPollTimer, projectId, startPolling]);

  const beginRun = useCallback(
    async (
      start: () => Promise<
        | { runId: string }
        | { error: string; batchStatus?: "failed" | "requires_page_selection" }
      >
    ) => {
      setIsStarting(true);
      setErrorMessage(null);
      setErrorCode(null);

      try {
        const response = await start();

        if ("error" in response && response.error) {
          const mapped = mapAnalysisError(response.error, response.batchStatus);
          setErrorMessage(mapped.message);
          setErrorCode(mapped.code);
          setPhase("failed");
          return { ok: false as const, error: mapped.message };
        }

        if ("runId" in response) {
          startPolling(response.runId);
          return { ok: true as const, runId: response.runId };
        }

        return { ok: false as const, error: "Could not start analysis." };
      } catch {
        const mapped = mapAnalysisError("Analysis could not be completed.");
        setErrorMessage(mapped.message);
        setErrorCode(mapped.code);
        setPhase("failed");
        return { ok: false as const, error: mapped.message };
      } finally {
        setIsStarting(false);
      }
    },
    [startPolling]
  );

  return {
    runId,
    phase,
    snapshot,
    stages,
    progressPercent,
    result,
    errorMessage,
    errorCode,
    isStarting,
    isRunning: phase === "running",
    isActive: phase !== "idle",
    beginRun,
    reset,
  };
}
