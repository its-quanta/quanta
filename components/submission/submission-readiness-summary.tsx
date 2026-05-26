"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import type { TenderValidationResult } from "@/src/lib/submission/types";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Project } from "@/src/types/database";
import { cn } from "@/lib/utils";

type SubmissionReadinessSummaryProps = {
  project: Project;
  validation: TenderValidationResult;
  onFixIssues: () => void;
  onPreviewPack: () => void;
};

export function SubmissionReadinessSummary({
  project,
  validation,
  onFixIssues,
  onPreviewPack,
}: SubmissionReadinessSummaryProps) {
  const currency = useOrganisationCurrency();
  const isReady = validation.readinessStatus === "ready";

  return (
    <section className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Readiness
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <p
                className={cn(
                  "font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl",
                  isReady ? "text-emerald-700" : "text-foreground"
                )}
              >
                {validation.readinessScore}%
              </p>
              <Badge
                variant="outline"
                className={cn(
                  isReady
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                    : "border-amber-500/50 bg-amber-500/10 text-amber-900"
                )}
              >
                {isReady ? "Ready" : "Not ready"}
              </Badge>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Critical</dt>
              <dd className="font-mono tabular-nums text-destructive">
                {validation.criticalCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Warnings</dt>
              <dd className="font-mono tabular-nums text-amber-800">
                {validation.warningCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tender value</dt>
              <dd className="font-mono text-sm tabular-nums">
                {formatCurrency(project.estimated_value, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due date</dt>
              <dd className="font-mono text-sm tabular-nums">
                {formatDate(project.tender_due_date)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onFixIssues}>
            Fix issues
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onPreviewPack}>
            Preview tender pack
          </Button>
        </div>
      </div>

      {validation.blockReasons.length > 0 ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Primary blockers
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {validation.blockReasons.slice(0, 5).map((reason) => (
              <li key={reason} className="text-foreground">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
