"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScopePanelMode } from "@/components/scope/scope-panel-mode";
import type { AiReviewItem } from "@/src/types/database";

type ScopeStatusBarProps = {
  items: AiReviewItem[];
  takeoffCount: number;
  panelMode?: ScopePanelMode;
  undoLabel?: string | null;
  onUndo?: () => void;
  className?: string;
};

export function ScopeStatusBar({
  items,
  takeoffCount,
  panelMode = "suggestions",
  undoLabel,
  onUndo,
  className,
}: ScopeStatusBarProps) {
  const pendingCount = items.filter(
    (item) => item.status === "pending" || item.status === "adjusted"
  ).length;
  const acceptedCount = items.filter((item) => item.status === "accepted").length;
  const rejectedCount = items.filter((item) => item.status === "rejected").length;
  const allReviewed = pendingCount === 0 && items.length > 0;

  return (
    <footer
      className={cn(
        "flex h-8 shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 text-xs",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
        {allReviewed ? (
          <span className="font-medium text-foreground">
            ✓ All {items.length} suggestion{items.length === 1 ? "" : "s"} reviewed
          </span>
        ) : (
          <>
            <span>
              <span className="text-foreground">○ {pendingCount}</span> pending
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="text-emerald-800">✓ {acceptedCount}</span> accepted
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="text-destructive">× {rejectedCount}</span> rejected
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {undoLabel && onUndo ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-0.5 shadow-sm">
            <span>{undoLabel}</span>
            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onUndo}>
              Undo
            </Button>
          </div>
        ) : null}
        <span className="hidden text-muted-foreground xl:inline">
          {panelMode === "takeoff"
            ? "Click a line to jump to its drawing page"
            : "Click a flag to review · Accept and reject update instantly"}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          Takeoff {takeoffCount}
          {allReviewed ? " ✓" : pendingCount > 0 ? " ●" : ""}
        </span>
      </div>
    </footer>
  );
}
