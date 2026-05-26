"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import { buildSubmissionActionHref } from "@/src/lib/submission/links";
import type { TenderValidationResult } from "@/src/lib/submission/types";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Project } from "@/src/types/database";
import { cn } from "@/lib/utils";

type SubmissionHeroProps = {
  project: Project;
  projectId: string;
  validation: TenderValidationResult;
  onFixIssues: () => void;
  onPreviewTender: () => void;
};

export function SubmissionHero({
  project,
  projectId,
  validation,
  onFixIssues,
  onPreviewTender,
}: SubmissionHeroProps) {
  const currency = useOrganisationCurrency();
  const isReady = validation.readinessStatus === "ready";
  const primaryAction = validation.actions[0];

  return (
    <section className="rounded-[14px] border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tender readiness
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight",
                isReady ? "text-emerald-700" : "text-foreground"
              )}
            >
              {validation.readinessScore}%
            </p>
            <Badge
              variant="outline"
              className={cn(
                "mt-2",
                isReady
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-900"
              )}
            >
              {validation.readinessLabel}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Critical</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-destructive">
                {validation.criticalCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Warnings</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-amber-800">
                {validation.warningCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tender due</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">
                {formatDate(project.tender_due_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tender value</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">
                {formatCurrency(project.estimated_value, currency)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" onClick={onFixIssues}>
            Fix issues
          </Button>
          <Button type="button" variant="outline" onClick={onPreviewTender}>
            Preview tender
          </Button>
          {primaryAction ? (
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href={buildSubmissionActionHref(projectId, primaryAction)}>
                {primaryAction.label}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {validation.blockReasons.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Primary blockers
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground">
            {validation.blockReasons.slice(0, 4).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-destructive" aria-hidden>
                  ·
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
