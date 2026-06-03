"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AiReviewAdjustDialog } from "@/components/ai-review/ai-review-adjust-dialog";
import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import { AiReviewSourceDialog } from "@/components/ai-review/ai-review-source-dialog";
import { AiReviewStatusBadge } from "@/components/ai-review/ai-review-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  acceptAiReviewItemAction,
  rejectAiReviewItemAction,
} from "@/src/lib/ai-review/actions";
import { formatQuantity } from "@/src/lib/format";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type AiReviewSuggestionCardProps = {
  projectId: string;
  item: AiReviewItem;
  selected: boolean;
  sourceName: string;
  documents: Document[];
  documentPages: DocumentPage[];
  onSelect: () => void;
  onOpenEvidence: () => void;
};

export function AiReviewSuggestionCard({
  projectId,
  item,
  selected,
  sourceName,
  documents,
  documentPages,
  onSelect,
  onOpenEvidence,
}: AiReviewSuggestionCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const canDecide =
    item.status === "pending" || item.status === "adjusted";

  function runAction(action: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
      window.dispatchEvent(
        new CustomEvent("quanta:ai-review-updated", {
          detail: { projectId },
        })
      );
    });
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
        selected
          ? "border-primary/50 ring-2 ring-primary/20"
          : "border-border hover:border-primary/30"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {item.description}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.trade}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tabular-nums">
              {formatQuantity(item.quantity)} {item.unit}
            </span>
            {item.page_number != null ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono tabular-nums">
                  Page {item.page_number}
                </span>
              </>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{sourceName}</p>
          {item.reasoning ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.reasoning}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <AiReviewStatusBadge status={item.status} />
          <AiReviewConfidenceBadge confidence={item.confidence} />
        </div>
      </div>

      {actionError ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div
        className="mt-4 flex flex-wrap gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        {canDecide ? (
          <>
            <Button
              type="button"
              size="default"
              className="h-10 min-w-[5.5rem]"
              disabled={isPending}
              onClick={() =>
                runAction(() => acceptAiReviewItemAction(item.id, projectId))
              }
            >
              Accept
            </Button>
            <Button
              type="button"
              size="default"
              variant="secondary"
              className="h-10 min-w-[5.5rem]"
              disabled={isPending}
              onClick={() => setAdjustOpen(true)}
            >
              Adjust
            </Button>
            <Button
              type="button"
              size="default"
              variant="outline"
              className="h-10 min-w-[5.5rem]"
              disabled={isPending}
              onClick={() =>
                runAction(() => rejectAiReviewItemAction(item.id, projectId))
              }
            >
              Reject
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="default"
          variant="outline"
          className="h-10"
          onClick={() => {
            if (item.source_document_id) {
              setSourceOpen(true);
            } else {
              onOpenEvidence();
            }
          }}
        >
          View drawing
        </Button>
      </div>

      <AiReviewAdjustDialog
        item={item}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        projectId={projectId}
        onSuccess={() => {
          setAdjustOpen(false);
          router.refresh();
        }}
      />

      <AiReviewSourceDialog
        item={item}
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
      />
    </article>
  );
}
