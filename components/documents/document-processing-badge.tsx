import { Badge } from "@/components/ui/badge";
import { PROCESSING_STATUS_LABELS } from "@/src/lib/documents/constants";
import type { DocumentProcessingStatus } from "@/src/types/database";
import { cn } from "@/lib/utils";

type DocumentProcessingBadgeProps = {
  status: DocumentProcessingStatus;
};

export function DocumentProcessingBadge({
  status,
}: DocumentProcessingBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "ready" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "pending" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
        status === "failed" &&
          "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      {PROCESSING_STATUS_LABELS[status]}
    </Badge>
  );
}
