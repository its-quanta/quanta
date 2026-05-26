"use client";

import { WorkflowMetricCards } from "@/components/projects/workflow-metric-cards";
import type { AiReviewSummary } from "@/src/lib/ai-review/summary";

type AiReviewSummaryProps = {
  summary: AiReviewSummary;
  scopeGapsIdentified: number;
};

export function AiReviewSummaryCards({
  summary,
  scopeGapsIdentified,
}: AiReviewSummaryProps) {
  return (
    <WorkflowMetricCards
      columns={6}
      metrics={[
        {
          label: "Pending review",
          value: String(summary.pendingReview),
          accent:
            summary.pendingReview > 0 ? "text-amber-800" : undefined,
        },
        {
          label: "Accepted",
          value: String(summary.accepted),
          accent: summary.accepted > 0 ? "text-emerald-700" : undefined,
        },
        {
          label: "Rejected",
          value: String(summary.rejected),
        },
        {
          label: "Needs adjustment",
          value: String(summary.needsAdjustment),
          accent:
            summary.needsAdjustment > 0 ? "text-violet-800" : undefined,
        },
        {
          label: "Average confidence",
          value: summary.averageConfidenceLabel,
        },
        {
          label: "Scope gaps identified",
          value: String(scopeGapsIdentified),
          accent: scopeGapsIdentified > 0 ? "text-amber-800" : undefined,
          hint: "From scope review checks",
        },
      ]}
    />
  );
}
