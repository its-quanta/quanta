"use client";

import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  parseOverlayGeometry,
  tradeColour,
} from "@/src/lib/ai-review/overlay";
import { matchesConfidenceFilter } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

const DENSE_FLAG_THRESHOLD = 10;

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

export const ScopeAnnotationLayer = memo(function ScopeAnnotationLayer({
  pageAnnotations,
  selectedItemId,
  tradeFilter,
  confidenceFilter,
  onSelectItem,
}: ScopeAnnotationLayerProps) {
  const positionedItems = useMemo(
    () =>
      pageAnnotations.filter(
        (item) => parseOverlayGeometry(item.overlay_geometry) !== null
      ),
    [pageAnnotations]
  );

  const stackedItems = useMemo(
    () =>
      pageAnnotations.filter(
        (item) => parseOverlayGeometry(item.overlay_geometry) === null
      ),
    [pageAnnotations]
  );

  const useCompactFlags = pageAnnotations.length > DENSE_FLAG_THRESHOLD;

  if (pageAnnotations.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {!useCompactFlags
        ? positionedItems.map((item) => {
            const geometry = parseOverlayGeometry(item.overlay_geometry);
            if (!geometry || geometry.type !== "bbox") {
              return null;
            }
            const selected = item.id === selectedItemId;
            const dimmed = isDimmed(item, tradeFilter, confidenceFilter);
            const colour = tradeColour(item.trade);

            if (!selected) {
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.description}
                  className={cn(
                    "pointer-events-auto absolute size-2.5 rounded-full border shadow-sm transition-transform hover:scale-125",
                    dimmed && "opacity-20"
                  )}
                  style={{
                    left: `${(geometry.x + geometry.width / 2) * 100}%`,
                    top: `${(geometry.y + geometry.height / 2) * 100}%`,
                    borderColor: colour,
                    backgroundColor: colour,
                  }}
                  onClick={() => onSelectItem(item.id)}
                />
              );
            }

            return (
              <div key={item.id}>
                <div
                  className={cn("absolute border-2", dimmed && "opacity-20")}
                  style={{
                    left: `${geometry.x * 100}%`,
                    top: `${geometry.y * 100}%`,
                    width: `${geometry.width * 100}%`,
                    height: `${geometry.height * 100}%`,
                    borderColor: colour,
                    backgroundColor: `${colour}1A`,
                  }}
                />
              </div>
            );
          })
        : null}

      <div className="absolute right-2 top-2 flex max-h-[70%] flex-col flex-wrap gap-1 overflow-hidden">
        {(useCompactFlags ? pageAnnotations : stackedItems).map((item, index) => {
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
                useCompactFlags
                  ? selected
                    ? "size-6 border-2 text-[10px]"
                    : "size-4 text-[8px]"
                  : selected
                    ? "size-6 border-2 text-[10px]"
                    : "size-3.5 border",
                selected && "ring-2 ring-primary/25",
                dimmed && "opacity-20"
              )}
              style={{
                borderColor: colour,
                backgroundColor: selected ? colour : `${colour}33`,
                color: selected ? "white" : colour,
              }}
              onClick={() => onSelectItem(item.id)}
            >
              {useCompactFlags ? (
                <span>{index + 1}</span>
              ) : (
                <span className="sr-only">{item.trade}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
