"use client";

import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Project } from "@/src/types/database";
import type { SubmissionPreviewData } from "@/src/lib/submission/preview";

type SubmissionTenderSummaryProps = {
  project: Project;
  preview: SubmissionPreviewData;
  takeoffCount: number;
  pricedCount: number;
};

export function SubmissionTenderSummary({
  project,
  preview,
  takeoffCount,
  pricedCount,
}: SubmissionTenderSummaryProps) {
  const currency = useOrganisationCurrency();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tender summary</CardTitle>
        <CardDescription>Snapshot for final review.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Project</dt>
            <dd className="text-right font-medium">{project.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Client</dt>
            <dd className="text-right">{project.client_name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Due date</dt>
            <dd className="font-mono tabular-nums">
              {formatDate(project.tender_due_date)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Tender value</dt>
            <dd className="font-mono tabular-nums">
              {formatCurrency(project.estimated_value, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Priced sell (calc.)</dt>
            <dd className="font-mono tabular-nums">
              {preview.pricingTotalSell !== null
                ? formatCurrency(preview.pricingTotalSell, currency)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Takeoff / priced</dt>
            <dd className="font-mono tabular-nums">
              {takeoffCount} / {pricedCount}
            </dd>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <ProjectStatusBadge status={project.status} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
