"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";
import { tradeColour } from "@/src/lib/ai-review/overlay";
import { matchesConfidenceFilter } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

function isDimmed(
  item: AiReviewItem,
  tradeFilter: string | null,
  confidenceFilter: "high" | "medium" | "low" | null
): boolean {
  if (tradeFilter && item.trade !== tradeFilter) {
    return true;
  }
  if (confidenceFilter && !matchesConfidenceFilter(item, confidenceFilter)) {
    return true;
  }
  return false;
}

type ScopeAnnotationLayerProps = {
  pageAnnotations: AiReviewItem[];
  selectedItemId: string | null;
  tradeFilter: string | null;
  confidenceFilter: "high" | "medium" | "low" | null;
  onSelectItem: (itemId: string) => void;
};

/** Right-edge numbered markers for suggestions on the active page (no bbox overlays). */
export const ScopeAnnotationLayer = memo(function ScopeAnnotationLayer({
  pageAnnotations,
  selectedItemId,
  tradeFilter,
  confidenceFilter,
  onSelectItem,
}: ScopeAnnotationLayerProps) {
  if (pageAnnotations.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute right-2 top-2 flex max-h-[85%] flex-col gap-1 overflow-hidden">
        {pageAnnotations.map((item, index) => {
          const selected = item.id === selectedItemId;
          const dimmed = isDimmed(item, tradeFilter, confidenceFilter);
          const colour = tradeColour(item.trade);

          return (
            <button
              key={item.id}
              type="button"
              title={item.description}
              className={cn(
                "pointer-events-auto flex items-center justify-center rounded-full border font-mono font-semibold shadow-sm transition-all",
                selected ? "size-6 border-2 text-[10px]" : "size-4 text-[9px]",
                selected && "ring-2 ring-primary/30",
                dimmed && "opacity-25"
              )}
              style={{
                borderColor: colour,
                backgroundColor: selected ? colour : `${colour}40`,
                color: selected ? "white" : colour,
              }}
              onClick={() => onSelectItem(item.id)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
});
