"use client";

import { cn } from "@/lib/utils";

type ConfidenceFilter = "high" | "medium" | "low" | null;

type ScopeSuggestionsQueueHeaderProps = {
  pendingCount: number;
  confidenceFilter: ConfidenceFilter;
  onConfidenceFilterChange: (filter: ConfidenceFilter) => void;
};

const CONFIDENCE_FILTERS: { id: ConfidenceFilter; label: string }[] = [
  { id: null, label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export function ScopeSuggestionsQueueHeader({
  pendingCount,
  confidenceFilter,
  onConfidenceFilterChange,
}: ScopeSuggestionsQueueHeaderProps) {
  return (
    <div className="shrink-0 space-y-2 border-b border-border px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Suggestions</h3>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {pendingCount} pending
        </p>
      </div>
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Filter by confidence"
      >
        {CONFIDENCE_FILTERS.map((filter) => {
          const active = confidenceFilter === filter.id;
          return (
            <button
              key={filter.label}
              type="button"
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              aria-pressed={active}
              onClick={() => onConfidenceFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
