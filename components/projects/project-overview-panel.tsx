"use client";

import Link from "next/link";

import { ProjectReadinessSummary } from "@/components/projects/project-readiness-summary";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectScopeGapsCard } from "@/components/scope-gaps/project-scope-gaps-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import { formatCurrency, formatDate } from "@/src/lib/format";
import {
  deriveProjectRisk,
  getTenderRiskLabel,
} from "@/src/lib/projects/risk";
import type { ProjectReadinessMetrics } from "@/src/lib/projects/readiness";
import type {
  ScopeGapSummary,
  WorkspaceTabValue,
} from "@/src/lib/scope-gaps/types";
import type { Project } from "@/src/types/database";

type ProjectOverviewPanelProps = {
  project: Project;
  readiness: ProjectReadinessMetrics;
  scopeGapSummary: ScopeGapSummary;
  onNavigateTab: (tab: WorkspaceTabValue, takeoffId?: string) => void;
};

export function ProjectOverviewPanel({
  project,
  readiness,
  scopeGapSummary,
  onNavigateTab,
}: ProjectOverviewPanelProps) {
  const currency = useOrganisationCurrency();
  const risk = deriveProjectRisk(project, scopeGapSummary.totalGaps);

  return (
    <div className="flex flex-col gap-6">
      <ProjectReadinessSummary metrics={readiness} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tender snapshot</CardTitle>
            <CardDescription>
              Command centre for this estimate — deadlines, value, and risk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Due date</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums">
                  {formatDate(project.tender_due_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tender value</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums">
                  {formatCurrency(project.estimated_value, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Risk level</dt>
                <dd className="mt-1">
                  <Badge variant="outline">{getTenderRiskLabel(risk)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Scope gaps</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums">
                  {scopeGapSummary.totalGaps}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <ProjectStatusBadge status={project.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Client</dt>
                <dd className="mt-1 text-sm">{project.client_name ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
            <CardDescription>Estimator flow for this tender.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm">
              {[
                { label: "Tender inputs", tab: "tender-inputs" as const },
                { label: "Scope review", tab: "scope-review" as const },
                { label: "Commercial review", tab: "commercial-review" as const },
                { label: "Submission", tab: "submission" as const },
              ].map((step) => (
                <li key={step.tab}>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => onNavigateTab(step.tab)}
                  >
                    {step.label}
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              <Link href="/standards" className="text-primary hover:underline">
                Organisation standards
              </Link>{" "}
              feed references across tenders.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Project type</dt>
              <dd className="mt-1 text-sm">{project.project_type ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Trade scope</dt>
              <dd className="mt-1 text-sm">{project.trade_scope ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Site address</dt>
              <dd className="mt-1 text-sm">{project.site_address ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {project.notes ?? "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <ProjectScopeGapsCard
        projectId={project.id}
        totalGaps={scopeGapSummary.totalGaps}
        byKind={scopeGapSummary.byKind}
        gaps={scopeGapSummary.gaps}
        onNavigateTab={(tab, takeoffId) =>
          onNavigateTab(tab as WorkspaceTabValue, takeoffId)
        }
      />
    </div>
  );
}
