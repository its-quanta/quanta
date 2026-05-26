"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AiReviewAdjustDialog } from "@/components/ai-review/ai-review-adjust-dialog";
import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import { AiReviewSourceDialog } from "@/components/ai-review/ai-review-source-dialog";
import { AiReviewStatusBadge } from "@/components/ai-review/ai-review-status-badge";
import { Button } from "@/components/ui/button";
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

type AiReviewTableProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
};

export function AiReviewTable({
  projectId,
  items,
  documents,
  documentPages,
}: AiReviewTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [adjustItem, setAdjustItem] = useState<AiReviewItem | null>(null);
  const [sourceItem, setSourceItem] = useState<AiReviewItem | null>(null);

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

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
      <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No suggestions to review</p>
        <p className="mt-2 text-sm text-muted-foreground">
          When AI takeoff generation is enabled, proposed lines will appear here
          for your approval before they enter the live takeoff.
        </p>
      </div>
    );
  }

  return (
    <>
      {actionError ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Suggested item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Drawing ref</TableHead>
              <TableHead>Sheet</TableHead>
              <TableHead className="text-right">Page</TableHead>
              <TableHead className="min-w-[160px]">Reasoning</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const rowPending = isPending && pendingId === item.id;
              const canDecide =
                item.status === "pending" || item.status === "adjusted";
              const documentName = item.source_document_id
                ? drawingContext.documentNames.get(item.source_document_id) ??
                  "—"
                : "—";

              return (
                <TableRow key={item.id} className="align-top hover:bg-muted/20">
                  <TableCell>
                    <AiReviewStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <AiReviewConfidenceBadge confidence={item.confidence} />
                  </TableCell>
                  <TableCell className="text-sm">{item.trade}</TableCell>
                  <TableCell className="max-w-[180px]">
                    <p className="font-medium text-foreground">{item.description}</p>
                    {item.review_notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.review_notes}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-sm">
                    {formatQuantity(item.quantity)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.unit}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs">
                    {documentName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.drawing_reference ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.sheet_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {item.page_number ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {item.reasoning ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-1">
                      {canDecide ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={rowPending}
                            onClick={() =>
                              runAction(item.id, () =>
                                acceptAiReviewItemAction(item.id, projectId)
                              )
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={rowPending}
                            onClick={() => setAdjustItem(item)}
                          >
                            Adjust
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={rowPending}
                        onClick={() => setSourceItem(item)}
                      >
                        Open source
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AiReviewAdjustDialog
        item={adjustItem}
        projectId={projectId}
        open={Boolean(adjustItem)}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustItem(null);
          }
        }}
        onSuccess={() => router.refresh()}
      />

      <AiReviewSourceDialog
        item={sourceItem}
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
        open={Boolean(sourceItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSourceItem(null);
          }
        }}
      />
    </>
  );
}
