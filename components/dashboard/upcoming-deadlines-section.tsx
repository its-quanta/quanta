import Link from "next/link";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/src/lib/format";
import type { UpcomingDeadline } from "@/src/lib/dashboard/stats";

type UpcomingDeadlinesSectionProps = {
  deadlines: UpcomingDeadline[];
};

export function UpcomingDeadlinesSection({
  deadlines,
}: UpcomingDeadlinesSectionProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3 pt-6">
        {deadlines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tender deadlines in the next 14 days.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {deadlines.map((deadline) => (
              <li
                key={`${deadline.projectId}-${deadline.dueDate}`}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${deadline.projectId}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary"
                  >
                    {deadline.projectName}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDate(deadline.dueDate)}
                    <span className="mx-1.5 text-border">·</span>
                    {deadline.daysUntil === 0
                      ? "Due today"
                      : deadline.daysUntil === 1
                        ? "1 day"
                        : `${deadline.daysUntil} days`}
                  </p>
                </div>
                <ProjectStatusBadge status={deadline.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
