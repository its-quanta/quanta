import type { CommercialPerformanceMetric } from "@/src/lib/dashboard/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CommercialPerformanceSectionProps = {
  metrics: CommercialPerformanceMetric[];
};

export function CommercialPerformanceSection({
  metrics,
}: CommercialPerformanceSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} size="sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
