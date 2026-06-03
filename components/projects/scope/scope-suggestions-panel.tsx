"use client";

import { useMemo, useState } from "react";

import type { AiReviewQueueSort } from "@/components/ai-review/ai-review-approval-queue";
import { AiReviewSuggestionCard } from "@/components/ai-review/ai-review-suggestion-card";
import { VirtualList } from "@/components/ui/virtual-list";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matchesConfidenceFilter } from "@/src/lib/ai-review/constants";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type ScopeSuggestionsPanelProps = {
  projectId: string;
  queueItems: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  onOpenEvidence: (item: AiReviewItem) => void;
  confidenceFilter: "medium" | "low" | null;
  onConfidenceFilter: (filter: "medium" | "low" | null) => void;
};

function sortQueueItems(
  items: AiReviewItem[],
  sort: AiReviewQueueSort,
  documentNames: Map<string, string>
): AiReviewItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "confidence": {
        const ac = a.confidence ?? -1;
        const bc = b.confidence ?? -1;
        return bc - ac;
      }
      case "trade":
        return a.trade.localeCompare(b.trade);
      case "status":
        return a.status.localeCompare(b.status);
      case "document": {
        const an = a.source_document_id
          ? documentNames.get(a.source_document_id) ?? ""
          : "";
        const bn = b.source_document_id
          ? documentNames.get(b.source_document_id) ?? ""
          : "";
        return an.localeCompare(bn);
      }
      default:
        return 0;
    }
  });
  return copy;
}

export function ScopeSuggestionsPanel({
  projectId,
  queueItems,
  documents,
  documentPages,
  selectedItemId,
  onSelectItem,
  onOpenEvidence,
  confidenceFilter,
  onConfidenceFilter,
}: ScopeSuggestionsPanelProps) {
  const [sort, setSort] = useState<AiReviewQueueSort>("confidence");

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const visibleItems = useMemo(() => {
    const filtered = queueItems.filter((item) =>
      matchesConfidenceFilter(item, confidenceFilter)
    );
    return sortQueueItems(filtered, sort, drawingContext.documentNames);
  }, [queueItems, confidenceFilter, sort, drawingContext.documentNames]);

  if (queueItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-foreground">
          No suggestions to triage
        </p>
        <p className="mt-2 max-w-md text-base text-muted-foreground">
          Run document analysis under Discover, then return here to accept,
          adjust, or reject draft lines before they enter takeoff.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Suggestions</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Triage AI drafts — only pending items appear here. Accepted lines move
          to Takeoff.
        </p>
      </div>

      <div className="flex shrink-0 items-end justify-between gap-3">
        <p className="text-base font-medium tabular-nums text-foreground">
          {visibleItems.length} to review
        </p>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="scope-suggestions-sort"
            className="text-sm text-muted-foreground"
          >
            Sort
          </Label>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as AiReviewQueueSort)}
          >
            <SelectTrigger
              id="scope-suggestions-sort"
              className="h-10 w-[10rem] text-base"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="trade">Trade</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-base text-muted-foreground">
          No pending items match this filter.
        </div>
      ) : (
        <VirtualList
          items={visibleItems}
          estimateSize={220}
          measureDynamic
          getItemKey={(item) => item.id}
          renderItem={(item) => {
            const sourceName = item.source_document_id
              ? drawingContext.documentNames.get(item.source_document_id) ??
                "Document"
              : "—";
            return (
              <AiReviewSuggestionCard
                projectId={projectId}
                item={item}
                selected={item.id === selectedItemId}
                sourceName={sourceName}
                documents={documents}
                documentPages={documentPages}
                onSelect={() => {
                  onSelectItem(item.id);
                  onOpenEvidence(item);
                }}
                onOpenEvidence={() => onOpenEvidence(item)}
              />
            );
          }}
        />
      )}

      <p className="shrink-0 text-sm text-muted-foreground">
        Review before adding to takeoff.
      </p>
    </div>
  );
}
