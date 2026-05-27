"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptAiReviewItemAction } from "@/src/lib/ai-review/actions";
import {
  confidenceToPercent,
  resolveConfidenceLevel,
} from "@/src/lib/ai-review/constants";
import type { AiReviewModeMetrics } from "@/src/lib/ai-review/review-metrics";
import type { AiReviewItem } from "@/src/types/database";

type AiReviewModeBarProps = {
  projectId: string;
  items: AiReviewItem[];
  metrics: AiReviewModeMetrics;
  onFocusConfidence: (filter: "medium" | "low" | null) => void;
  activeConfidenceFilter: "medium" | "low" | null;
};

export function AiReviewModeBar({
  projectId,
  items,
  metrics,
  onFocusConfidence,
  activeConfidenceFilter,
}: AiReviewModeBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function approveHighConfidence() {
    const pending = items.filter((item) => {
      if (item.status !== "pending" && item.status !== "adjusted") {
        return false;
      }
      const percent = confidenceToPercent(item.confidence);
      return percent !== null && percent >= 90;
    });

    if (pending.length === 0) {
      return;
    }

    startTransition(async () => {
      for (const item of pending) {
        const result = await acceptAiReviewItemAction(item.id, projectId);
        if (result.error) {
          return;
        }
      }
      router.refresh();
    });
  }

  const statClass =
    "flex flex-col gap-0.5 rounded-md border border-border bg-muted/20 px-3 py-2 min-w-[5.5rem]";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <div className={statClass}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Pending
          </span>
          <span className="font-mono text-lg tabular-nums">{metrics.pending}</span>
        </div>
        <div className={statClass}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Approved
          </span>
          <span className="font-mono text-lg tabular-nums">{metrics.approved}</span>
        </div>
        <div className={statClass}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Medium
          </span>
          <span className="font-mono text-lg tabular-nums text-amber-900">
            {metrics.mediumConfidence}
          </span>
        </div>
        <div className={statClass}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Low
          </span>
          <span className="font-mono text-lg tabular-nums text-destructive">
            {metrics.lowConfidence}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending || metrics.highConfidencePending === 0}
          onClick={approveHighConfidence}
        >
          Approve &gt;90%
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeConfidenceFilter === "medium" ? "secondary" : "outline"}
          onClick={() =>
            onFocusConfidence(activeConfidenceFilter === "medium" ? null : "medium")
          }
        >
          Review medium
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeConfidenceFilter === "low" ? "secondary" : "outline"}
          onClick={() =>
            onFocusConfidence(activeConfidenceFilter === "low" ? null : "low")
          }
        >
          Review low
        </Button>
      </div>
    </div>
  );
}

export function matchesConfidenceFilter(
  item: AiReviewItem,
  filter: "medium" | "low" | null
): boolean {
  if (!filter) {
    return true;
  }
  const level = resolveConfidenceLevel(item.confidence);
  return filter === "medium" ? level === "medium" : level === "low";
}
