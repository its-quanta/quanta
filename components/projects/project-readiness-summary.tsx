import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectReadinessCounts } from "@/src/lib/projects/readiness";

type ProjectReadinessSummaryProps = {
  counts: ProjectReadinessCounts;
};

const metrics: {
  key: keyof ProjectReadinessCounts;
  label: string;
  accent?: string;
}[] = [
  { key: "documentsUploaded", label: "Documents uploaded" },
  { key: "takeoffItems", label: "Takeoff items" },
  { key: "pricedItems", label: "Priced items", accent: "text-emerald-700" },
  {
    key: "packageAppliedItems",
    label: "Package-applied items",
    accent: "text-violet-800",
  },
  { key: "unpricedItems", label: "Unpriced items", accent: "text-amber-800" },
];

export function ProjectReadinessSummary({ counts }: ProjectReadinessSummaryProps) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Project readiness</CardTitle>
        <CardDescription>
          Quick counts for tender setup — from your saved project data.
        </CardDescription>
      </CardHeader>
      <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-lg border border-border bg-muted/20 px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p
              className={`mt-1 font-mono text-xl font-semibold tabular-nums ${metric.accent ?? "text-foreground"}`}
            >
              {counts[metric.key]}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
