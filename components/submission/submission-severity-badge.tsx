import { Badge } from "@/components/ui/badge";
import type { ValidationSeverity } from "@/src/lib/submission/types";
import { cn } from "@/lib/utils";

type SubmissionSeverityBadgeProps = {
  severity: ValidationSeverity;
};

export function SubmissionSeverityBadge({
  severity,
}: SubmissionSeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 font-medium",
        severity === "critical" &&
          "border-destructive/50 bg-destructive/10 text-destructive",
        severity === "warning" &&
          "border-amber-500/50 bg-amber-500/10 text-amber-900",
        severity === "info" &&
          "border-primary/40 bg-primary/5 text-primary"
      )}
    >
      {severity === "critical"
        ? "Critical"
        : severity === "warning"
          ? "Warning"
          : "Info"}
    </Badge>
  );
}
