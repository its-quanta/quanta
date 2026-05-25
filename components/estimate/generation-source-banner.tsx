import { formatDateTime } from "@/src/lib/format";
import type { GenerationSourceInfo } from "@/src/lib/estimate-generation/summary";

type GenerationSourceBannerProps = {
  sources: GenerationSourceInfo[];
};

export function GenerationSourceBanner({ sources }: GenerationSourceBannerProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Apply an assembly package on a takeoff line to generate materials and
        labour automatically.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3">
      {sources.map((source) => (
        <div
          key={`${source.packageName}-${source.regeneratedAt}`}
          className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-foreground">
            Generated from:{" "}
            <span className="font-medium">{source.packageName}</span>
          </p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            Regenerated: {formatDateTime(source.regeneratedAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
