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
import type { WorkspaceStepStatus } from "@/src/lib/projects/workspace-steps";
import type {
  ScopeGapSummary,
  WorkspaceTabValue,
} from "@/src/lib/scope-gaps/types";
import type { Project } from "@/src/types/database";

type ProjectOverviewPanelProps = {
  project: Project;
  readiness: ProjectReadinessMetrics;
  scopeGapSummary: ScopeGapSummary;
  workflowSteps: WorkspaceStepStatus[];
  onNavigateTab: (tab: WorkspaceTabValue, takeoffId?: string) => void;
};

const WORKFLOW_TAB: Record<string, WorkspaceTabValue> = {
  upload: "plans-specs",
  "ai-review": "ai-review",
  "build-up": "build-up",
  commercial: "commercial",
  submit: "submission",
};

export function ProjectOverviewPanel({
  project,
  readiness,
  scopeGapSummary,
  workflowSteps,
  onNavigateTab,
}: ProjectOverviewPanelProps) {
  const currency = useOrganisationCurrency();
  const risk = deriveProjectRisk(project, scopeGapSummary.totalGaps);
  const dueDateLabel = project.tender_due_date
    ? formatDate(project.tender_due_date)
    : "No due date";

  const keyBlockers = workflowSteps
    .filter((step) => step.status === "blocked" || (step.issueCount ?? 0) > 0)
    .slice(0, 3);

  const recommended = workflowSteps
    .filter((step) => step.status !== "complete")
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Overview</h2>
        <p className="text-sm text-muted-foreground">
          What needs attention next on this tender.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tender readiness</CardTitle>
            <CardDescription>
              A short view of progress, risk, and what is blocking submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Due date</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums">
                  {dueDateLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tender value</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums">
                  {formatCurrency(project.estimated_value, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Risk</dt>
                <dd className="mt-1">
                  <Badge variant="outline">{getTenderRiskLabel(risk)}</Badge>
                </dd>
              </div>
            </dl>

            <ProjectReadinessSummary metrics={readiness} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next actions</CardTitle>
            <CardDescription>
              Recommended steps based on current completion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="flex flex-col gap-2 text-sm">
              {recommended.map((step) => {
                const tab = WORKFLOW_TAB[step.id];
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 text-left text-primary hover:underline"
                      onClick={() => tab && onNavigateTab(tab)}
                    >
                      <span>{step.label}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground no-underline">
                        {step.detail}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <p className="text-xs text-muted-foreground">
              <Link href="/standards" className="text-primary hover:underline">
                Organisation standards
              </Link>{" "}
              support traceable references.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Key blockers</CardTitle>
            <CardDescription>
              Items most likely to delay pricing or submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keyBlockers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No blockers detected from the workflow summary.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {keyBlockers.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{step.label}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {step.issueCount && step.issueCount > 0
                        ? `${step.issueCount} issue${
                            step.issueCount === 1 ? "" : "s"
                          }`
                        : step.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scope gaps</CardTitle>
            <CardDescription>Unresolved gaps flagged on takeoff lines.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl tabular-nums">{scopeGapSummary.totalGaps}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Review gaps to keep the tender defensible.
            </p>
          </CardContent>
        </Card>
      </div>

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
