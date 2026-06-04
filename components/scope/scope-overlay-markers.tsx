"use client";

import { memo } from "react";

import type { ScopePageMarker } from "@/components/scope/scope-marker-positions";
import { cn } from "@/lib/utils";
import { tradeColour } from "@/src/lib/ai-review/overlay";

type ScopeOverlayMarkersProps = {
  markers: ScopePageMarker[];
  onSelectItem: (itemId: string) => void;
};

export const ScopeOverlayMarkers = memo(function ScopeOverlayMarkers({
  markers,
  onSelectItem,
}: ScopeOverlayMarkersProps) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {markers.map((marker) => {
        const colour = tradeColour(marker.trade);
        return (
          <button
            key={marker.itemId}
            type="button"
            title={`${marker.label} — select`}
            className={cn(
              "pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-mono text-[10px] font-bold shadow-md transition-transform",
              marker.selected ? "size-7 ring-2 ring-primary/40" : "size-5",
              marker.dimmed && "opacity-30"
            )}
            style={{
              left: `${marker.x * 100}%`,
              top: `${marker.y * 100}%`,
              borderColor: colour,
              backgroundColor: marker.selected ? colour : `${colour}cc`,
              color: marker.selected ? "#fff" : colour,
            }}
            onClick={() => onSelectItem(marker.itemId)}
          >
            {marker.label}
          </button>
        );
      })}
    </div>
  );
});
