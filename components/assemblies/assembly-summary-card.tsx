import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculatePackageSummary,
} from "@/src/lib/assemblies/calculations";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import type { AssemblyPackage } from "@/src/types/database";

type AssemblySummaryCardProps = {
  assemblyPackage: AssemblyPackage;
  componentCount: number;
};

export function AssemblySummaryCard({
  assemblyPackage,
  componentCount,
}: AssemblySummaryCardProps) {
  const summary = calculatePackageSummary(
    assemblyPackage.default_cost_rate,
    assemblyPackage.default_sell_rate,
    componentCount
  );

  const metrics = [
    { label: "Cost per unit", value: formatCurrency(summary.costPerUnit) },
    { label: "Sell per unit", value: formatCurrency(summary.sellPerUnit) },
    {
      label: "Gross profit per unit",
      value: formatCurrency(summary.grossProfitPerUnit),
    },
    {
      label: "Margin",
      value: formatPercent(summary.marginPercent),
    },
    { label: "Components", value: String(summary.componentCount) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Package summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rolled up from components per {assemblyPackage.unit}. Review before
          applying on a tender.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt className="text-xs text-muted-foreground">{metric.label}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
