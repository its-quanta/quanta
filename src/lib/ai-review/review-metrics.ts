import {
  confidenceToPercent,
  resolveConfidenceLevel,
} from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

export type AiReviewModeMetrics = {
  pending: number;
  approved: number;
  mediumConfidence: number;
  lowConfidence: number;
  highConfidencePending: number;
};

export function computeAiReviewModeMetrics(
  items: AiReviewItem[]
): AiReviewModeMetrics {
  const pendingItems = items.filter(
    (item) => item.status === "pending" || item.status === "adjusted"
  );

  return {
    pending: pendingItems.length,
    approved: items.filter((item) => item.status === "accepted").length,
    mediumConfidence: pendingItems.filter(
      (item) => resolveConfidenceLevel(item.confidence) === "medium"
    ).length,
    lowConfidence: pendingItems.filter(
      (item) => resolveConfidenceLevel(item.confidence) === "low"
    ).length,
    highConfidencePending: pendingItems.filter((item) => {
      const percent = confidenceToPercent(item.confidence);
      return percent !== null && percent >= 90;
    }).length,
  };
}
