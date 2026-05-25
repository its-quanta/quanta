import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCOPE_GAP_LABELS } from "@/src/lib/scope-gaps/constants";
import type {
  OrganisationScopeGapSummary,
  ScopeGapKind,
} from "@/src/lib/scope-gaps/types";

type ScopeGapsDashboardWidgetProps = {
  summary: OrganisationScopeGapSummary;
};

export function ScopeGapsDashboardWidget({
  summary,
}: ScopeGapsDashboardWidgetProps) {
  const kindsWithGaps = (Object.keys(summary.byKind) as ScopeGapKind[]).filter(
    (kind) => summary.byKind[kind] > 0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Scope gaps</CardTitle>
            <CardDescription>
              Outstanding package, pricing, generation, drawing, and standards
              gaps across active tenders.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              summary.totalGaps > 0
                ? "border-amber-500/50 bg-amber-500/10 font-mono tabular-nums text-amber-900"
                : "bg-emerald-500/10 font-mono tabular-nums text-emerald-800"
            }
          >
            {summary.totalGaps > 0 ? summary.totalGaps : "None"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary.totalGaps === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scope gaps on active tender takeoff lines.
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {kindsWithGaps.map((kind) => (
                <div
                  key={kind}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {SCOPE_GAP_LABELS[kind]}
                  </p>
                  <p className="font-mono text-lg font-semibold tabular-nums text-amber-900">
                    {summary.byKind[kind]}
                  </p>
                </div>
              ))}
            </div>

            {summary.projectSummaries.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Projects with gaps
                </p>
                <ul className="flex flex-col gap-2">
                  {summary.projectSummaries.slice(0, 6).map((project) => (
                    <li key={project.project_id}>
                      <Link
                        href={`/projects/${project.project_id}?tab=overview`}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="font-medium text-foreground">
                          {project.project_name}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-amber-800">
                          {project.gap_count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
