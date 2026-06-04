"use client";

import { memo } from "react";

import { ScopeSuggestionRow } from "@/components/scope/scope-suggestion-row";
import { ScopeSuggestionsQueueHeader } from "@/components/scope/scope-suggestions-queue-header";
import { VirtualList } from "@/components/ui/virtual-list";
import type { AiReviewItem, Document } from "@/src/types/database";

type ConfidenceFilter = "high" | "medium" | "low" | null;

export type ScopeSuggestionsQueueProps = {
  pendingCount: number;
  visibleQueueItems: AiReviewItem[];
  documentsById: ReadonlyMap<string, Document>;
  confidenceFilter: ConfidenceFilter;
  onConfidenceFilterChange: (filter: ConfidenceFilter) => void;
  selectedItemId: string | null;
  actionPendingId: string | null;
  onSelectItem: (itemId: string) => void;
  onAccept: (itemId: string) => void;
  onAdjust: (itemId: string) => void;
  onReject: (itemId: string) => void;
};

const LIST_HEADER = (
  <div className="grid h-7 shrink-0 grid-cols-[3.5rem_1fr_3rem_2.25rem_2.5rem_2rem_auto] gap-1 border-b border-border bg-muted/30 px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    <span>Trade</span>
    <span>Description</span>
    <span className="text-right">Qty</span>
    <span>Conf</span>
    <span>Dwg#</span>
    <span>Pg</span>
    <span className="text-right">Act</span>
  </div>
);

export const ScopeSuggestionsQueue = memo(function ScopeSuggestionsQueue({
  pendingCount,
  visibleQueueItems,
  documentsById,
  confidenceFilter,
  onConfidenceFilterChange,
  selectedItemId,
  actionPendingId,
  onSelectItem,
  onAccept,
  onAdjust,
  onReject,
}: ScopeSuggestionsQueueProps) {
  return (
    <>
      <ScopeSuggestionsQueueHeader
        pendingCount={pendingCount}
        confidenceFilter={confidenceFilter}
        onConfidenceFilterChange={onConfidenceFilterChange}
      />
      {LIST_HEADER}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {pendingCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-sm font-medium">No pending suggestions</p>
            <p className="mt-2 text-xs text-muted-foreground">
              All suggestions on this project have been reviewed.
            </p>
          </div>
        ) : visibleQueueItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
            No items match the current filters.
          </div>
        ) : (
          <VirtualList
            items={visibleQueueItems}
            estimateSize={32}
            className="min-h-0 flex-1 overflow-y-auto"
            getItemKey={(item) => item.id}
            renderItem={(item) => (
              <ScopeSuggestionRow
                item={item}
                documentsById={documentsById}
                selected={item.id === selectedItemId}
                actionPending={actionPendingId === item.id}
                onSelect={onSelectItem}
                onAccept={onAccept}
                onAdjust={onAdjust}
                onReject={onReject}
              />
            )}
          />
        )}
      </div>
    </>
  );
});
