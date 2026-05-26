import { formatConfidencePercent } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

export type AiReviewSummary = {
  pendingReview: number;
  accepted: number;
  rejected: number;
  needsAdjustment: number;
  averageConfidence: number | null;
  averageConfidenceLabel: string;
  totalSuggestions: number;
};

export function computeAiReviewSummary(items: AiReviewItem[]): AiReviewSummary {
  const pendingReview = items.filter((item) => item.status === "pending").length;
  const accepted = items.filter((item) => item.status === "accepted").length;
  const rejected = items.filter((item) => item.status === "rejected").length;
  const needsAdjustment = items.filter((item) => item.status === "adjusted").length;

  const withConfidence = items.filter((item) => item.confidence !== null);
  const averageConfidence =
    withConfidence.length > 0
      ? withConfidence.reduce((sum, item) => sum + (item.confidence ?? 0), 0) /
        withConfidence.length
      : null;

  return {
    pendingReview,
    accepted,
    rejected,
    needsAdjustment,
    averageConfidence,
    averageConfidenceLabel: formatConfidencePercent(averageConfidence),
    totalSuggestions: items.length,
  };
}
