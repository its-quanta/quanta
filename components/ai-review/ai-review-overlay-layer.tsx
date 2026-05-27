"use client";

import { cn } from "@/lib/utils";
import {
  itemToOverlayObject,
  overlayStatusOpacity,
  tradeColour,
  type AiReviewOverlayGeometry,
} from "@/src/lib/ai-review/overlay";
import { formatConfidencePercent } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

type AiReviewOverlayLayerProps = {
  items: AiReviewItem[];
  selectedItemId: string | null;
  showLayer: boolean;
  className?: string;
};

function geometryToSvgProps(
  geometry: AiReviewOverlayGeometry,
  colour: string,
  opacity: number,
  selected: boolean
) {
  const strokeWidth = selected ? 3 : 2;
  const fillOpacity = opacity * 0.2;

  if (geometry.type === "bbox") {
    return (
      <rect
        x={`${geometry.x * 100}%`}
        y={`${geometry.y * 100}%`}
        width={`${geometry.width * 100}%`}
        height={`${geometry.height * 100}%`}
        fill={colour}
        fillOpacity={fillOpacity}
        stroke={colour}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        rx={2}
      />
    );
  }

  const points = geometry.points
    .map(([x, y]) => `${x * 100},${y * 100}`)
    .join(" ");

  return (
    <polygon
      points={points}
      fill={colour}
      fillOpacity={fillOpacity}
      stroke={colour}
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function AiReviewOverlayLayer({
  items,
  selectedItemId,
  showLayer,
  className,
}: AiReviewOverlayLayerProps) {
  if (!showLayer) {
    return null;
  }

  const overlays = items
    .map((item) => itemToOverlayObject(item, item.id === selectedItemId))
    .filter((overlay) => overlay.geometry !== null);

  if (overlays.length === 0) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-end justify-center p-3",
          className
        )}
      >
        <p className="rounded-md border border-border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          No overlay geometry linked to suggestions on this view yet.
        </p>
      </div>
    );
  }

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {overlays.map((overlay) => {
        const colour = tradeColour(overlay.trade);
        const opacity = overlayStatusOpacity(overlay.status);
        if (!overlay.geometry) {
          return null;
        }
        return (
          <g key={overlay.itemId}>
            {geometryToSvgProps(
              overlay.geometry,
              colour,
              opacity,
              overlay.selected
            )}
            {overlay.selected ? (
              <title>
                {overlay.label} · {overlay.trade} ·{" "}
                {formatConfidencePercent(overlay.confidence)}
              </title>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
