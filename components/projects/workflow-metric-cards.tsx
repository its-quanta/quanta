import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPercent } from "@/src/lib/format";

export type WorkflowMetric = {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
};

type WorkflowMetricCardsProps = {
  metrics: WorkflowMetric[];
  columns?: 2 | 3 | 4 | 5 | 6;
};

const columnClass: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

export function WorkflowMetricCards({
  metrics,
  columns = 4,
}: WorkflowMetricCardsProps) {
  return (
    <div className={`grid gap-3 ${columnClass[columns]}`}>
      {metrics.map((metric) => (
        <Card key={metric.label} size="sm">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs">{metric.label}</CardDescription>
            <CardTitle
              className={`font-mono text-xl tabular-nums ${metric.accent ?? ""}`}
            >
              {metric.value}
            </CardTitle>
            {metric.hint ? (
              <p className="text-xs text-muted-foreground">{metric.hint}</p>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function formatMetricPercent(value: number | null): string {
  return value === null ? "—" : formatPercent(value);
}
