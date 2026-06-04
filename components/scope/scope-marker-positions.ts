import { parseOverlayGeometry } from "@/src/lib/ai-review/overlay";
import { matchesConfidenceFilter } from "@/src/lib/ai-review/constants";
import type { AiReviewItem, TakeoffItem } from "@/src/types/database";

export type ScopePageMarker = {
  itemId: string;
  label: string;
  x: number;
  y: number;
  trade: string;
  selected: boolean;
  dimmed: boolean;
};

function centroidFromGeometry(
  geometry: ReturnType<typeof parseOverlayGeometry>
): { x: number; y: number } | null {
  if (!geometry) {
    return null;
  }
  if (geometry.type === "bbox") {
    return {
      x: geometry.x + geometry.width / 2,
      y: geometry.y + geometry.height / 2,
    };
  }
  const points = geometry.points;
  if (points.length === 0) {
    return null;
  }
  const sum = points.reduce(
    (acc, [px, py]) => ({ x: acc.x + px, y: acc.y + py }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function fallbackPosition(index: number, total: number): { x: number; y: number } {
  const top = 0.1;
  const bottom = 0.9;
  const y =
    total <= 1
      ? 0.5
      : top + (index / Math.max(total - 1, 1)) * (bottom - top);
  return { x: 0.94, y };
}

function isSuggestionDimmed(
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

export function buildSuggestionPageMarkers(
  pageItems: readonly AiReviewItem[],
  selectedItemId: string | null,
  tradeFilter: string | null,
  confidenceFilter: "high" | "medium" | "low" | null
): ScopePageMarker[] {
  return pageItems.map((item, index) => {
    const geometry = parseOverlayGeometry(item.overlay_geometry);
    const centroid = centroidFromGeometry(geometry);
    const position = centroid ?? fallbackPosition(index, pageItems.length);

    return {
      itemId: item.id,
      label: `D${index + 1}`,
      x: Math.min(0.98, Math.max(0.02, position.x)),
      y: Math.min(0.98, Math.max(0.02, position.y)),
      trade: item.trade,
      selected: item.id === selectedItemId,
      dimmed: isSuggestionDimmed(item, tradeFilter, confidenceFilter),
    };
  });
}

export function buildTakeoffPageMarkers(
  pageItems: readonly TakeoffItem[],
  selectedItemId: string | null,
  tradeFilter: string | null
): ScopePageMarker[] {
  return pageItems.map((item, index) => {
    const position = fallbackPosition(index, pageItems.length);
    return {
      itemId: item.id,
      label: `D${index + 1}`,
      x: position.x,
      y: position.y,
      trade: item.trade,
      selected: item.id === selectedItemId,
      dimmed: Boolean(tradeFilter && item.trade !== tradeFilter),
    };
  });
}
