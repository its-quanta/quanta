import type { AiReviewItem, AiReviewItemStatus } from "@/src/types/database";

export type AiReviewOverlayGeometry =
  | {
      type: "bbox";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "polygon";
      points: [number, number][];
    };

export type AiReviewOverlayObject = {
  itemId: string;
  trade: string;
  geometry: AiReviewOverlayGeometry | null;
  confidence: number | null;
  status: AiReviewItemStatus;
  label: string;
  selected: boolean;
};

const TRADE_COLOUR_MAP: Record<string, string> = {
  Carpentry: "#3B82F6",
  Demolition: "#EF4444",
  Deconstruction: "#F97316",
  Partitions: "#8B5CF6",
  Ceilings: "#06B6D4",
  Flooring: "#10B981",
  Painting: "#EC4899",
  Joinery: "#6366F1",
  Glazing: "#14B8A6",
  Electrical: "#F59E0B",
  Plumbing: "#0EA5E9",
  Mechanical: "#64748B",
  General: "#6B7280",
  Other: "#9AA3B2",
};

export function tradeColour(trade: string): string {
  return TRADE_COLOUR_MAP[trade] ?? TRADE_COLOUR_MAP.General;
}

export function parseOverlayGeometry(
  value: unknown
): AiReviewOverlayGeometry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = record.type;

  if (type === "bbox") {
    const x = Number(record.x);
    const y = Number(record.y);
    const width = Number(record.width);
    const height = Number(record.height);
    if (
      [x, y, width, height].some((n) => Number.isNaN(n)) ||
      width <= 0 ||
      height <= 0
    ) {
      return null;
    }
    return { type: "bbox", x, y, width, height };
  }

  if (type === "polygon" && Array.isArray(record.points)) {
    const points = record.points
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) {
          return null;
        }
        const px = Number(pair[0]);
        const py = Number(pair[1]);
        if (Number.isNaN(px) || Number.isNaN(py)) {
          return null;
        }
        return [px, py] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);

    if (points.length < 3) {
      return null;
    }
    return { type: "polygon", points };
  }

  return null;
}

export function itemToOverlayObject(
  item: AiReviewItem & { overlay_geometry?: unknown },
  selected: boolean
): AiReviewOverlayObject {
  return {
    itemId: item.id,
    trade: item.trade,
    geometry: parseOverlayGeometry(item.overlay_geometry),
    confidence: item.confidence,
    status: item.status,
    label: item.description,
    selected,
  };
}

export function overlayStatusOpacity(status: AiReviewItemStatus): number {
  if (status === "rejected") {
    return 0.35;
  }
  if (status === "accepted") {
    return 0.85;
  }
  return 0.65;
}
