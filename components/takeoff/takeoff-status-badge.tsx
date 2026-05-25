import { Badge } from "@/components/ui/badge";
import { TAKEOFF_STATUS_LABELS } from "@/src/lib/takeoff/constants";
import type { TakeoffItemStatus } from "@/src/types/database";
import { cn } from "@/lib/utils";

type TakeoffStatusBadgeProps = {
  status: TakeoffItemStatus;
};

export function TakeoffStatusBadge({ status }: TakeoffStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "ai_draft" &&
          "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
        status === "needs_review" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
        status === "reviewed" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "priced" &&
          "border-primary/30 bg-primary/10 text-primary",
        status === "excluded" &&
          "border-muted-foreground/30 bg-muted text-muted-foreground"
      )}
    >
      {TAKEOFF_STATUS_LABELS[status]}
    </Badge>
  );
}
