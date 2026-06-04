"use client";

import { memo } from "react";

import { ScopeTakeoffReadinessBadge } from "@/components/scope/scope-takeoff-readiness-badge";
import { resolveTakeoffDrawingRef } from "@/components/scope/scope-drawing-references";
import type { ScopeTakeoffReadiness } from "@/components/scope/scope-takeoff-readiness";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/src/lib/format";
import type { Document, TakeoffItem } from "@/src/types/database";

export type ScopeTakeoffCompactRowProps = {
  item: TakeoffItem;
  documentsById: ReadonlyMap<string, Document>;
  selected: boolean;
  readiness: ScopeTakeoffReadiness;
  onSelect: (itemId: string) => void;
};

export const ScopeTakeoffCompactRow = memo(function ScopeTakeoffCompactRow({
  item,
  documentsById,
  selected,
  readiness,
  onSelect,
}: ScopeTakeoffCompactRowProps) {
  const drawingRef = resolveTakeoffDrawingRef(item, documentsById);
  const description =
    item.description?.trim() || item.item_name?.trim() || "Untitled line";

  return (
    <button
      type="button"
      className={cn(
        "grid h-8 min-h-8 w-full grid-cols-[3.5rem_1fr_3rem_2.5rem_2rem_auto] items-center gap-1 border-b border-border/60 px-1.5 text-left text-xs",
        selected
          ? "bg-sky-50/90 dark:bg-sky-950/25"
          : "hover:bg-muted/30"
      )}
      onClick={() => onSelect(item.id)}
    >
      <span className="truncate font-medium text-muted-foreground">{item.trade}</span>
      <span className="min-w-0 truncate text-foreground">{description}</span>
      <span className="truncate text-right font-mono tabular-nums text-muted-foreground">
        {formatQuantity(item.quantity)}
      </span>
      <span
        className="truncate font-mono text-[10px] tabular-nums text-muted-foreground"
        title={drawingRef.drawing_number ?? undefined}
      >
        {drawingRef.drawing_number ?? "—"}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {drawingRef.page_number ?? "—"}
      </span>
      <ScopeTakeoffReadinessBadge readiness={readiness} className="justify-self-end" />
    </button>
  );
});
