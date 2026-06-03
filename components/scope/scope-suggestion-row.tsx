"use client";

import { memo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatConfidencePercent,
  resolveConfidenceLevel,
} from "@/src/lib/ai-review/constants";
import { formatQuantity } from "@/src/lib/format";
import type { AiReviewItem } from "@/src/types/database";

export type ScopeSuggestionRowProps = {
  item: AiReviewItem;
  selected: boolean;
  actionPending: boolean;
  onSelect: (itemId: string) => void;
  onAccept: (itemId: string) => void;
  onReject: (itemId: string) => void;
};

function CompactConfidence({ confidence }: { confidence: number | null }) {
  const level = resolveConfidenceLevel(confidence);
  const label = formatConfidencePercent(confidence);

  return (
    <span
      className={cn(
        "inline-flex w-14 shrink-0 justify-end font-mono text-[10px] tabular-nums",
        level === "high" && "text-emerald-700",
        level === "medium" && "text-amber-800",
        level === "low" && "text-destructive"
      )}
    >
      {level ? `${label}` : "—"}
    </span>
  );
}

export const ScopeSuggestionRow = memo(function ScopeSuggestionRow({
  item,
  selected,
  actionPending,
  onSelect,
  onAccept,
  onReject,
}: ScopeSuggestionRowProps) {
  const level = resolveConfidenceLevel(item.confidence);

  return (
    <div
      className={cn(
        "box-border flex h-[5.5rem] max-h-[5.5rem] min-h-[5.5rem] flex-col overflow-hidden rounded-md border px-2.5 py-2",
        selected
          ? "border-sky-400/80 bg-sky-50/90 dark:border-sky-500/50 dark:bg-sky-950/30"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/10"
      )}
    >
      <button
        type="button"
        className="min-h-0 min-w-0 flex-1 text-left"
        onClick={() => onSelect(item.id)}
      >
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {item.description}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{item.trade}</span>
          <span className="shrink-0" aria-hidden>
            ·
          </span>
          <span className="shrink-0 font-mono tabular-nums">
            {formatQuantity(item.quantity)} {item.unit}
          </span>
          {item.page_number != null ? (
            <>
              <span className="shrink-0" aria-hidden>
                ·
              </span>
              <span className="shrink-0 font-mono tabular-nums">
                p.{item.page_number}
              </span>
            </>
          ) : null}
          <CompactConfidence confidence={item.confidence} />
          <span className="sr-only">
            {level ? `${level} confidence` : "Unknown confidence"}
          </span>
        </p>
      </button>

      <div className="mt-1 flex shrink-0 items-center justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          disabled={actionPending}
          onClick={() => onReject(item.id)}
        >
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 px-3 text-xs"
          disabled={actionPending}
          onClick={() => onAccept(item.id)}
        >
          Accept
        </Button>
      </div>
    </div>
  );
});
