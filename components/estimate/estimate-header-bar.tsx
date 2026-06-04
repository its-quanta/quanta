"use client";

type EstimateHeaderBarProps = {
  itemCount: number;
};

export function EstimateHeaderBar({ itemCount }: EstimateHeaderBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-medium">Estimate</h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
      </div>
    </header>
  );
}
