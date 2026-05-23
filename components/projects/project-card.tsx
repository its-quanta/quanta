import Link from "next/link";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Project } from "@/src/types/database";

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <Card className="transition-colors duration-150 hover:bg-muted/30">
        <CardHeader className="gap-2 pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base group-hover:text-primary">
              {project.name}
            </CardTitle>
            <ProjectStatusBadge status={project.status} />
          </div>
          <CardDescription className="line-clamp-2">
            {[project.client_name, project.trade_scope].filter(Boolean).join(" · ") ||
              "No client or trade scope set"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="text-foreground/70">Due </span>
            <span className="font-mono tabular-nums">
              {formatDate(project.tender_due_date)}
            </span>
          </div>
          <div>
            <span className="text-foreground/70">Type </span>
            <span>{project.project_type ?? "—"}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-foreground/70">Est. value </span>
            <span className="font-mono tabular-nums text-foreground">
              {formatCurrency(project.estimated_value)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
