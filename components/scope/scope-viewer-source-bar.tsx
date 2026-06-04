"use client";

import { memo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScopeViewerSourceBarProps = {
  documentName: string;
  pageNumber: number | null;
  totalPages: number | null;
  drawingReference: string | null;
  sheetNumber: string | null;
  onFullscreen?: () => void;
  fullscreenLabel?: string;
  className?: string;
};

export const ScopeViewerSourceBar = memo(function ScopeViewerSourceBar({
  documentName,
  pageNumber,
  totalPages,
  drawingReference,
  sheetNumber,
  onFullscreen,
  fullscreenLabel = "Fullscreen",
  className,
}: ScopeViewerSourceBarProps) {
  const pageLabel =
    pageNumber != null && pageNumber > 0
      ? totalPages != null && totalPages > 0
        ? `Page ${pageNumber}/${totalPages}`
        : `Page ${pageNumber}`
      : "No page linked";

  const drawingNumber = drawingReference?.trim() || null;
  const drawingName = sheetNumber?.trim() || null;

  return (
    <div
      className={cn(
        "flex h-9 max-h-9 shrink-0 items-center gap-2 border-b border-border/80 bg-muted/20 px-2",
        className
      )}
    >
      <span
        className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
        title={documentName}
      >
        {documentName}
      </span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {pageLabel}
      </span>
      {drawingNumber ? (
        <span
          className="hidden max-w-[5rem] shrink-0 truncate font-mono text-[11px] text-muted-foreground sm:inline"
          title={`Drawing ${drawingNumber}`}
        >
          {drawingNumber}
        </span>
      ) : null}
      {drawingName ? (
        <span
          className="hidden min-w-0 max-w-[7rem] shrink truncate text-[11px] text-muted-foreground md:inline"
          title={drawingName}
        >
          {drawingName}
        </span>
      ) : null}
      {onFullscreen ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={onFullscreen}
        >
          {fullscreenLabel}
        </Button>
      ) : null}
    </div>
  );
});
