import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMetricPercent } from "@/components/projects/workflow-metric-cards";
import type { ProjectReadinessMetrics } from "@/src/lib/projects/readiness";

type ProjectReadinessSummaryProps = {
  metrics: ProjectReadinessMetrics;
};

export function ProjectReadinessSummary({
  metrics,
}: ProjectReadinessSummaryProps) {
  const coverageMetrics = [
    { label: "Documents uploaded", value: String(metrics.documentsUploaded) },
    {
      label: "Takeoff coverage",
      value: formatMetricPercent(metrics.takeoffCoveragePercent),
    },
    {
      label: "Package coverage",
      value: formatMetricPercent(metrics.packageCoveragePercent),
    },
    {
      label: "Pricing coverage",
      value: formatMetricPercent(metrics.pricingCoveragePercent),
    },
    {
      label: "Material generation",
      value: formatMetricPercent(metrics.materialGenerationPercent),
    },
    {
      label: "Labour generation",
      value: formatMetricPercent(metrics.labourGenerationPercent),
    },
    {
      label: "Standards coverage",
      value: formatMetricPercent(metrics.standardsCoveragePercent),
    },
    {
      label: "Exclusions drafted",
      value:
        metrics.exclusionsDraftedPercent === null
          ? "—"
          : formatMetricPercent(metrics.exclusionsDraftedPercent),
    },
  ];

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              Project readiness
            </CardTitle>
            <CardDescription>
              Coverage from saved takeoff, pricing, and generation data.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              metrics.readyForSubmission
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                : "border-amber-500/50 bg-amber-500/10 text-amber-900"
            }
          >
            Ready for submission: {metrics.readyForSubmission ? "Yes" : "No"}
          </Badge>
        </div>
      </CardHeader>
      <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        {coverageMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-border bg-muted/20 px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
