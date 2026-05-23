import type { ProjectStatus } from "@/src/types/database";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<
  ProjectStatus,
  "secondary" | "outline" | "default" | "destructive"
> = {
  draft: "secondary",
  in_review: "outline",
  submitted: "default",
  won: "default",
  lost: "secondary",
  archived: "secondary",
};

type ProjectStatusBadgeProps = {
  status: ProjectStatus;
  className?: string;
};

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={cn(
        status === "in_review" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        status === "submitted" && "bg-primary/10 text-primary",
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status];
}
