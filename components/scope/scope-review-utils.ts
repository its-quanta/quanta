import type { AiReviewItem, TakeoffItem } from "@/src/types/database";

export function isPendingReviewStatus(status: AiReviewItem["status"]): boolean {
  return status === "pending" || status === "adjusted";
}

export function selectNextPendingId(
  pendingItems: readonly AiReviewItem[],
  currentId: string | null,
  excludeId: string
): string | null {
  const remaining = pendingItems.filter((item) => item.id !== excludeId);
  if (remaining.length === 0) {
    return null;
  }
  if (!currentId) {
    return remaining[0].id;
  }
  const index = remaining.findIndex((item) => item.id === currentId);
  if (index === -1) {
    return remaining[0].id;
  }
  return remaining[index + 1]?.id ?? remaining[index - 1]?.id ?? remaining[0].id;
}

export function itemIdsSignature(items: readonly AiReviewItem[]): string {
  return items.map((item) => item.id).join(",");
}

export function takeoffIdsSignature(items: readonly TakeoffItem[]): string {
  return items.map((item) => item.id).join(",");
}

/** Compact source line for takeoff cards, e.g. p.6 · A201 · Demo Plan */
export function formatTakeoffSourceRef(
  item: TakeoffItem,
  documentName?: string | null,
  options?: { includePage?: boolean }
): string {
  const includePage = options?.includePage !== false;
  const parts: string[] = [];

  if (includePage && item.page_number != null) {
    parts.push(`p.${item.page_number}`);
  }

  if (item.drawing_reference?.trim()) {
    parts.push(item.drawing_reference.trim());
  } else if (item.sheet_number?.trim()) {
    parts.push(item.sheet_number.trim());
  } else if (includePage && item.page_number != null) {
    parts.push("No sheet ref");
  }

  if (documentName?.trim()) {
    parts.push(documentName.trim());
  }

  if (parts.length === 0) {
    return "No drawing ref";
  }

  return parts.join(" · ");
}

/** Compact source line for suggestion cards, e.g. p.6 · A201 · Demo Plan */
export function formatSuggestionSourceRef(
  item: AiReviewItem,
  documentName?: string | null,
  options?: { includePage?: boolean }
): string {
  const includePage = options?.includePage !== false;
  const parts: string[] = [];

  if (includePage && item.page_number != null) {
    parts.push(`p.${item.page_number}`);
  }

  if (item.drawing_reference?.trim()) {
    parts.push(item.drawing_reference.trim());
  } else if (item.sheet_number?.trim()) {
    parts.push(item.sheet_number.trim());
  } else if (includePage && item.page_number != null) {
    parts.push("No sheet ref");
  }

  if (documentName?.trim()) {
    parts.push(documentName.trim());
  }

  if (parts.length === 0) {
    return "No source page";
  }

  return parts.join(" · ");
}
