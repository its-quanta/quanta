"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalysisErrorCode } from "@/src/lib/ai-review/document-analysis/analysis-errors";
import type { AnalysisStageState } from "@/src/lib/ai-review/document-analysis/analysis-stages";
import type { AnalyseDocumentsResult } from "@/src/lib/ai-review/document-analysis/types";

type DocumentAnalysisProgressCardProps = {
  projectId: string;
  stages: AnalysisStageState[];
  progressPercent: number;
  runPhase: "running" | "complete" | "failed";
  result: AnalyseDocumentsResult | null;
  errorMessage: string | null;
  errorCode: AnalysisErrorCode | null;
  onDismiss: () => void;
};

function StageStatusIcon({ status }: { status: AnalysisStageState["status"] }) {
  if (status === "in_progress") {
    return (
      <span
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-600"
        aria-hidden
      />
    );
  }

  if (status === "complete") {
    return (
      <HugeiconsIcon
        icon={Tick02Icon}
        className="size-4 shrink-0 text-emerald-600"
        strokeWidth={2}
      />
    );
  }

  if (status === "failed") {
    return (
      <HugeiconsIcon
        icon={Cancel01Icon}
        className="size-4 shrink-0 text-destructive"
        strokeWidth={2}
      />
    );
  }

  return (
    <span
      className="size-4 shrink-0 rounded-full border border-border bg-muted/40"
      aria-hidden
    />
  );
}

function stageStatusLabel(status: AnalysisStageState["status"]): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

export function DocumentAnalysisProgressCard({
  projectId,
  stages,
  progressPercent,
  runPhase,
  result,
  errorMessage,
  errorCode,
  onDismiss,
}: DocumentAnalysisProgressCardProps) {
  const isRunning = runPhase === "running";
  const isComplete = runPhase === "complete";
  const isFailed = runPhase === "failed";

  const documentsCount = result?.analysedDocuments?.length ?? 0;
  const pagesCount =
    result?.pagesAnalysed ?? result?.selectedPageCount ?? 0;
  const suggestionsCount = result?.createdCount ?? 0;
  const lowConfidenceCount = result?.lowConfidenceCount ?? 0;
  const failedDocuments = result?.failedDocuments ?? [];

  return (
    <Card className="border-violet-500/25 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">
              Document analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isRunning
                ? "Quanta is analysing your selected pages. This may take a moment for large drawing sets."
                : isComplete
                  ? "Analysis finished. Review suggestions before accepting lines."
                  : "Analysis could not be completed."}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isRunning
                ? "border-violet-500/40 text-violet-700"
                : isComplete
                  ? "border-emerald-500/40 text-emerald-800"
                  : "border-destructive/40 text-destructive"
            }
          >
            {isRunning ? "Running" : isComplete ? "Complete" : "Failed"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono tabular-nums">{progressPercent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ol className="flex flex-col gap-2" aria-label="Analysis stages">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <StageStatusIcon status={stage.status} />
                <span
                  className={
                    stage.status === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }
                >
                  {stage.label}
                </span>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {stageStatusLabel(stage.status)}
              </Badge>
            </li>
          ))}
        </ol>

        {isFailed && errorMessage ? (
          <div
            className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            <HugeiconsIcon
              icon={Alert02Icon}
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2}
            />
            <div>
              <p>{errorMessage}</p>
              {errorCode ? (
                <p className="mt-1 text-xs text-destructive/80">
                  Reference: {errorCode.replaceAll("_", " ")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {isComplete && result?.summaryMessage ? (
          <p className="text-sm font-medium text-emerald-900">
            {result.summaryMessage}
          </p>
        ) : null}

        {isComplete && suggestionsCount > 0 && !result?.summaryMessage ? (
          <p className="text-sm font-medium text-emerald-900">
            {suggestionsCount} suggestion{suggestionsCount === 1 ? "" : "s"}{" "}
            created
          </p>
        ) : null}

        {isComplete && result ? (
          <dl className="grid gap-3 rounded-md border border-border/80 bg-muted/10 p-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Documents analysed</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">
                {documentsCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pages analysed</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">
                {pagesCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Suggestions created
              </dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">
                {suggestionsCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Low-confidence suggestions
              </dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums text-amber-800">
                {lowConfidenceCount}
              </dd>
            </div>
          </dl>
        ) : null}

        {isComplete && failedDocuments.length > 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-xs font-medium text-amber-950">
              Documents not included
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-xs text-amber-900/90">
              {failedDocuments.map((doc) => (
                <li key={`${doc.fileName}-${doc.reason}`}>
                  <span className="font-medium">{doc.fileName}</span>
                  {" — "}
                  {doc.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isComplete ? (
            <Button type="button" asChild>
              <Link href={`/projects/${projectId}?tab=ai-review`}>
                View AI Review
              </Link>
            </Button>
          ) : null}
          {!isRunning ? (
            <Button type="button" variant="outline" onClick={onDismiss}>
              {isComplete ? "Run another analysis" : "Back"}
            </Button>
          ) : null}
        </div>

        {isRunning ? (
          <p className="text-xs text-muted-foreground">
            You can continue using Plans &amp; specs while analysis runs in the
            background. Status updates every few seconds.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
