import { Badge } from "@/components/ui/badge";
import type { PackItemStatus } from "@/src/lib/submission/preview";
import { cn } from "@/lib/utils";

const LABELS: Record<PackItemStatus, string> = {
  included: "Included",
  missing: "Missing",
  needs_review: "Needs review",
};

export function PackItemStatusBadge({ status }: { status: PackItemStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-xs font-medium",
        status === "included" &&
          "border-emerald-500/50 bg-emerald-500/10 text-emerald-800",
        status === "missing" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        status === "needs_review" &&
          "border-amber-500/50 bg-amber-500/10 text-amber-900"
      )}
    >
      {LABELS[status]}
    </Badge>
  );
}
