import type { AllocationSegment } from "@/src/lib/projects/commercial-metrics";
import { formatCurrency, formatPercent } from "@/src/lib/format";

type MetricBarChartProps = {
  title: string;
  segments: AllocationSegment[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
};

export function MetricBarChart({
  title,
  segments,
  valueFormatter = formatCurrency,
  emptyMessage = "No data yet.",
}: MetricBarChartProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {segments.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {segments.slice(0, 8).map((segment) => (
            <li key={segment.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{segment.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {formatPercent(segment.percent)} ·{" "}
                  {valueFormatter(segment.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${Math.min(100, segment.percent)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
