"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import {
  matchesConfidenceFilter,
} from "@/components/ai-review/ai-review-mode-bar";
import { AiReviewStatusBadge } from "@/components/ai-review/ai-review-status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  acceptAiReviewItemAction,
  rejectAiReviewItemAction,
} from "@/src/lib/ai-review/actions";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import { formatQuantity } from "@/src/lib/format";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

export type AiReviewQueueSort =
  | "confidence"
  | "trade"
  | "status"
  | "document";

type AiReviewApprovalQueueProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  onOpenEvidence: (item: AiReviewItem) => void;
  confidenceFilter: "medium" | "low" | null;
};

function hasEvidenceLink(item: AiReviewItem): boolean {
  return Boolean(
    item.source_document_id ||
      item.drawing_reference ||
      item.page_number != null ||
      item.reasoning
  );
}

function sortItems(
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

export function AiReviewApprovalQueue({
  projectId,
  items,
  documents,
  documentPages,
  selectedItemId,
  onSelectItem,
  onOpenEvidence,
  confidenceFilter,
}: AiReviewApprovalQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sort, setSort] = useState<AiReviewQueueSort>("confidence");

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) =>
      matchesConfidenceFilter(item, confidenceFilter)
    );
    return sortItems(filtered, sort, drawingContext.documentNames);
  }, [items, confidenceFilter, sort, drawingContext.documentNames]);

  function runAction(itemId: string, action: () => Promise<{ error?: string }>) {
    setActionError(null);
    setPendingId(itemId);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium">Approval queue is empty</p>
        <p className="mt-2 text-xs text-muted-foreground">
          AI suggestions will appear here for evidence-backed review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor="ai-review-sort" className="text-xs text-muted-foreground">
          Sort
        </Label>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as AiReviewQueueSort)}
        >
          <SelectTrigger id="ai-review-sort" className="h-8 w-[9rem]">
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

      {actionError ? (
        <p className="text-xs text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 z-10 bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs">Trade</TableHead>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-right text-xs">Qty</TableHead>
              <TableHead className="text-xs">Conf.</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground"
                >
                  No items match this filter.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((item) => {
                const rowPending = isPending && pendingId === item.id;
                const canDecide =
                  item.status === "pending" || item.status === "adjusted";
                const selected = item.id === selectedItemId;
                const evidence = hasEvidenceLink(item);

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "cursor-pointer align-top hover:bg-muted/20",
                      selected && "bg-primary/5"
                    )}
                    onClick={() => {
                      onSelectItem(item.id);
                      onOpenEvidence(item);
                    }}
                  >
                    <TableCell className="text-xs">{item.trade}</TableCell>
                    <TableCell className="max-w-[7rem]">
                      <p className="line-clamp-2 text-xs font-medium">
                        {item.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] tabular-nums">
                      {formatQuantity(item.quantity)}
                    </TableCell>
                    <TableCell>
                      <AiReviewConfidenceBadge
                        confidence={item.confidence}
                        className="text-[10px]"
                      />
                    </TableCell>
                    <TableCell>
                      <AiReviewStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell
                      className="hidden"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex flex-col gap-1">
                        {canDecide ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={rowPending}
                              onClick={() =>
                                runAction(item.id, () =>
                                  acceptAiReviewItemAction(item.id, projectId)
                                )
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              disabled={rowPending}
                              onClick={() =>
                                runAction(item.id, () =>
                                  rejectAiReviewItemAction(item.id, projectId)
                                )
                              }
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {evidence ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => onOpenEvidence(item)}
                          >
                            Evidence
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Select a row to open the evidence drawer. Approve, adjust, or reject from
        the drawer.
      </p>
    </div>
  );
}
