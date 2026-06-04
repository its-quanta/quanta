"use client";

import { useMemo, useState, useTransition } from "react";

import {
  SCOPE_PANEL_MODES,
  type ScopePanelMode,
} from "@/components/scope/scope-panel-mode";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isConfidenceAtLeast } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

type ScopeToolbarProps = {
  panelMode: ScopePanelMode;
  onPanelModeChange: (mode: ScopePanelMode) => void;
  pendingSuggestionCount: number;
  takeoffLineCount: number;
  items: AiReviewItem[];
  tradeOptions: string[];
  tradeFilter: string | null;
  onTradeFilterChange: (trade: string | null) => void;
  onApproveHigh: (ids: string[]) => Promise<{ error: string | null }>;
};

export function ScopeToolbar({
  panelMode,
  onPanelModeChange,
  pendingSuggestionCount,
  takeoffLineCount,
  items,
  tradeOptions,
  tradeFilter,
  onTradeFilterChange,
  onApproveHigh,
}: ScopeToolbarProps) {
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const highConfidencePendingIds = useMemo(
    () =>
      items
        .filter((item) => {
          if (item.status !== "pending" && item.status !== "adjusted") {
            return false;
          }
          return isConfidenceAtLeast(item.confidence, 90);
        })
        .map((item) => item.id),
    [items]
  );

  function handleApproveHigh() {
    setBulkError(null);
    startTransition(async () => {
      const result = await onApproveHigh(highConfidencePendingIds);
      if (result.error) {
        setBulkError(result.error);
        return;
      }
      setConfirmBulk(false);
    });
  }

  return (
    <header className="flex h-10 shrink-0 grow-0 items-center gap-3 border-b border-border bg-card px-3">
      <div
        className="flex shrink-0 items-center rounded-md border border-border bg-muted/30 p-0.5"
        role="group"
        aria-label="Scope panel"
      >
        {SCOPE_PANEL_MODES.map((mode) => {
          const active = panelMode === mode.id;
          const count =
            mode.id === "suggestions"
              ? pendingSuggestionCount
              : takeoffLineCount;
          return (
            <button
              key={mode.id}
              type="button"
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={active}
              onClick={() => onPanelModeChange(mode.id)}
            >
              {mode.label}
              <span className="ml-1 font-mono tabular-nums text-muted-foreground">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Select
          value={tradeFilter ?? "all"}
          onValueChange={(value) =>
            onTradeFilterChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="h-8 w-[8.5rem] text-xs" aria-label="Trade filter">
            <SelectValue placeholder="Trade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trades</SelectItem>
            {tradeOptions.map((trade) => (
              <SelectItem key={trade} value={trade}>
                {trade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {panelMode === "suggestions" ? (
        <div className="flex shrink-0 items-center gap-2">
          {bulkError ? (
            <span
              className="max-w-[12rem] truncate text-xs text-destructive"
              role="alert"
            >
              {bulkError}
            </span>
          ) : null}
          {confirmBulk ? (
            <div className="flex items-center gap-2 text-xs">
              <span>
                Approve {highConfidencePendingIds.length} high-confidence item
                {highConfidencePendingIds.length === 1 ? "" : "s"}?
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7"
                disabled={isPending}
                onClick={handleApproveHigh}
              >
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                disabled={isPending}
                onClick={() => setConfirmBulk(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              disabled={highConfidencePendingIds.length === 0 || isPending}
              onClick={() => setConfirmBulk(true)}
            >
              Approve high ({highConfidencePendingIds.length})
            </Button>
          )}
        </div>
      ) : null}
    </header>
  );
}
