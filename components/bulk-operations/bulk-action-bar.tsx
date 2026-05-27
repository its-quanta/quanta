"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BulkActionBarProps = {
  selectedCount: number;
  onClear: () => void;
  children: ReactNode;
  className?: string;
};

export function BulkActionBar({
  selectedCount,
  onClear,
  children,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-lg",
        className
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <p className="mr-2 text-sm font-medium tabular-nums">
        {selectedCount} selected
      </p>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
