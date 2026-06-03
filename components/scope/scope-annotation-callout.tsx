"use client";

import { memo, useState } from "react";

import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPendingReviewStatus } from "@/components/scope/scope-review-utils";
import { formatQuantity } from "@/src/lib/format";
import type { AiReviewItem } from "@/src/types/database";

type ScopeAnnotationCalloutProps = {
  item: AiReviewItem;
  sourceName: string;
  actionPending: boolean;
  onAccept: () => void;
  onReject: () => void;
  onAdjust: () => void;
  onClose: () => void;
};

export const ScopeAnnotationCallout = memo(function ScopeAnnotationCallout({
  item,
  sourceName,
  actionPending,
  onAccept,
  onReject,
  onAdjust,
  onClose,
}: ScopeAnnotationCalloutProps) {
  const [showNote, setShowNote] = useState(false);
  const canDecide = isPendingReviewStatus(item.status);
  const reasoning = item.reasoning?.trim() ?? "";
  const longNote = reasoning.length > 120;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-3 left-3 z-20 w-[min(100%,20rem)]",
        "max-w-xs rounded-lg border border-border/80 bg-background/95 p-2.5 shadow-md backdrop-blur-sm"
      )}
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {item.description}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
        <span>{item.trade}</span>
        <span aria-hidden>·</span>
        <span className="font-mono tabular-nums">
          {formatQuantity(item.quantity)} {item.unit}
        </span>
        <AiReviewConfidenceBadge
          confidence={item.confidence}
          className="h-5 shrink-0 px-1.5 text-[9px]"
        />
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {item.page_number != null ? `p.${item.page_number}` : "—"}
        {" · "}
        {sourceName}
      </p>

      {reasoning ? (
        <div className="mt-1.5">
          {longNote && !showNote ? (
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline"
              onClick={() => setShowNote(true)}
            >
              Show note
            </button>
          ) : (
            <p
              className={cn(
                "text-[11px] leading-relaxed text-muted-foreground",
                longNote ? "line-clamp-4" : "line-clamp-2"
              )}
            >
              {reasoning}
            </p>
          )}
        </div>
      ) : null}

      {canDecide ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={actionPending}
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={actionPending}
            onClick={onAdjust}
          >
            Adjust
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={actionPending}
            onClick={onAccept}
          >
            Accept
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
});
