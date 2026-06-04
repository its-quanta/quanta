"use client";

import { memo } from "react";

import { resolveSuggestionDrawingRef } from "@/components/scope/scope-drawing-references";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatConfidencePercent,
  resolveConfidenceLevel,
} from "@/src/lib/ai-review/constants";
import { formatQuantity } from "@/src/lib/format";
import type { AiReviewItem, Document } from "@/src/types/database";

export type ScopeSuggestionRowProps = {
  item: AiReviewItem;
  documentsById: ReadonlyMap<string, Document>;
  selected: boolean;
  actionPending: boolean;
  onSelect: (itemId: string) => void;
  onAccept: (itemId: string) => void;
  onAdjust: (itemId: string) => void;
  onReject: (itemId: string) => void;
};

function ConfidenceCell({ confidence }: { confidence: number | null }) {
  const level = resolveConfidenceLevel(confidence);
  const label = formatConfidencePercent(confidence);

  return (
    <span
      className={cn(
        "font-mono text-[10px] tabular-nums",
        level === "high" && "text-emerald-700",
        level === "medium" && "text-amber-800",
        level === "low" && "text-destructive",
        !level && "text-muted-foreground"
      )}
    >
      {level ? label : "—"}
    </span>
  );
}


export const ScopeSuggestionRow = memo(function ScopeSuggestionRow({
  item,
  documentsById,
  selected,
  actionPending,
  onSelect,
  onAccept,
  onAdjust,
  onReject,
}: ScopeSuggestionRowProps) {
  const drawingRef = resolveSuggestionDrawingRef(item, documentsById);

  return (
    <div
      className={cn(
        "grid h-8 min-h-8 max-h-8 grid-cols-[3.5rem_1fr_3rem_2.25rem_2.5rem_2rem_auto] items-center gap-1 border-b border-border/60 px-1.5 text-xs",
        selected && "bg-sky-50/90 dark:bg-sky-950/25"
      )}
    >
      <button
        type="button"
        className="truncate text-left font-medium text-muted-foreground hover:text-foreground"
        onClick={() => onSelect(item.id)}
        title={item.trade}
      >
        {item.trade}
      </button>
      <button
        type="button"
        className="min-w-0 truncate text-left text-foreground hover:underline"
        onClick={() => onSelect(item.id)}
        title={item.description}
      >
        {item.description}
      </button>
      <button
        type="button"
        className="truncate text-right font-mono tabular-nums text-muted-foreground"
        onClick={() => onSelect(item.id)}
      >
        {formatQuantity(item.quantity)}
      </button>
      <ConfidenceCell confidence={item.confidence} />
      <span
        className="truncate font-mono text-[10px] tabular-nums text-muted-foreground"
        title={drawingRef.drawing_number ?? undefined}
      >
        {drawingRef.drawing_number ?? "—"}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {drawingRef.page_number ?? "—"}
      </span>
      <div className="flex shrink-0 items-center justify-end gap-0.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px]"
          disabled={actionPending}
          onClick={() => onReject(item.id)}
        >
          Rej
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px]"
          disabled={actionPending}
          onClick={() => onAdjust(item.id)}
        >
          Adj
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-6 px-1.5 text-[10px]"
          disabled={actionPending}
          onClick={() => onAccept(item.id)}
        >
          Acc
        </Button>
      </div>
    </div>
  );
});
