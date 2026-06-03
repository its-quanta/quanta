import type { AiReviewItem } from "@/src/types/database";

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
