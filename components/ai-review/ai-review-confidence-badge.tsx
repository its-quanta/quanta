import { Badge } from "@/components/ui/badge";
import {
  formatConfidencePercent,
  resolveConfidenceLevel,
} from "@/src/lib/ai-review/constants";
import { cn } from "@/lib/utils";

type AiReviewConfidenceBadgeProps = {
  confidence: number | null;
  className?: string;
};

export function AiReviewConfidenceBadge({
  confidence,
  className,
}: AiReviewConfidenceBadgeProps) {
  const level = resolveConfidenceLevel(confidence);
  const label = formatConfidencePercent(confidence);

  if (!level) {
    return (
      <Badge variant="outline" className={cn("font-mono tabular-nums", className)}>
        —
      </Badge>
    );
  }

  const levelLabel =
    level === "high" ? "High" : level === "medium" ? "Medium" : "Low";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-mono tabular-nums",
        level === "high" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
        level === "medium" && "border-amber-500/40 bg-amber-500/10 text-amber-900",
        level === "low" && "border-destructive/30 bg-destructive/5 text-destructive",
        className
      )}
    >
      <span>{label}</span>
      <span className="font-sans text-[10px] font-medium uppercase tracking-wide opacity-80">
        {levelLabel}
      </span>
    </Badge>
  );
}
