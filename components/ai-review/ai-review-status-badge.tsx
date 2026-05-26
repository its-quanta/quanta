import { Badge } from "@/components/ui/badge";
import { AI_REVIEW_STATUS_LABELS } from "@/src/lib/ai-review/constants";
import type { AiReviewItemStatus } from "@/src/types/database";
import { cn } from "@/lib/utils";

type AiReviewStatusBadgeProps = {
  status: AiReviewItemStatus;
};

export function AiReviewStatusBadge({ status }: AiReviewStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        status === "pending" && "border-amber-500/40 bg-amber-500/10 text-amber-900",
        status === "accepted" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
        status === "rejected" && "border-muted-foreground/30 text-muted-foreground",
        status === "adjusted" && "border-violet-500/30 bg-violet-500/10 text-violet-800"
      )}
    >
      {AI_REVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}
