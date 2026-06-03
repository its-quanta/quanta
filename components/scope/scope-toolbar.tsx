"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isConfidenceAtLeast } from "@/src/lib/ai-review/constants";
import type { AiReviewItem } from "@/src/types/database";

type ScopeToolbarProps = {
  items: AiReviewItem[];
  tradeFilter: string | null;
  onTradeFilterChange: (trade: string | null) => void;
  onApproveHigh: (ids: string[]) => Promise<{ error: string | null }>;
};

export function ScopeToolbar({
  items,
  tradeFilter,
  onTradeFilterChange,
  onApproveHigh,
}: ScopeToolbarProps) {
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const trades = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.trade.trim()) {
        set.add(item.trade);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

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
    <header className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Scope review</span>
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
            {trades.map((trade) => (
              <SelectItem key={trade} value={trade}>
                {trade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {bulkError ? (
          <span className="max-w-[12rem] truncate text-xs text-destructive" role="alert">
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
    </header>
  );
}
