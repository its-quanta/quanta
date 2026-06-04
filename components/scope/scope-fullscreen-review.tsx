"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  SCOPE_FULLSCREEN_BODY_CLASS,
  SCOPE_FULLSCREEN_CONTEXT_COLUMN_CLASS,
  SCOPE_FULLSCREEN_DRAWING_COLUMN_CLASS,
} from "@/components/scope/scope-layout";
import { Button } from "@/components/ui/button";
type ScopeFullscreenSourceBadge = {
  documentName: string;
  pageNumber: number | null;
  totalPages: number | null;
  drawingNumber: string | null;
  drawingName: string | null;
};

type ScopeFullscreenReviewProps = {
  open: boolean;
  onClose: () => void;
  projectName: string;
  sourceBadge: ScopeFullscreenSourceBadge;
  drawingPanel: React.ReactNode;
  contextPanel: React.ReactNode;
};

export function ScopeFullscreenReview({
  open,
  onClose,
  projectName,
  sourceBadge,
  drawingPanel,
  contextPanel,
}: ScopeFullscreenReviewProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const pageLabel =
    sourceBadge.pageNumber != null
      ? sourceBadge.totalPages != null && sourceBadge.totalPages > 0
        ? `Page ${sourceBadge.pageNumber} / ${sourceBadge.totalPages}`
        : `Page ${sourceBadge.pageNumber}`
      : "No page linked";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen scope review"
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
          <span className="truncate font-semibold text-foreground">{projectName}</span>
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            ·
          </span>
          <span
            className="hidden min-w-0 truncate text-muted-foreground sm:inline"
            title={sourceBadge.documentName}
          >
            {sourceBadge.documentName}
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {pageLabel}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={onClose}
        >
          Close
        </Button>
      </header>

      <div className={SCOPE_FULLSCREEN_BODY_CLASS}>
        <div className={SCOPE_FULLSCREEN_DRAWING_COLUMN_CLASS}>{drawingPanel}</div>
        <aside className={SCOPE_FULLSCREEN_CONTEXT_COLUMN_CLASS}>{contextPanel}</aside>
      </div>
    </div>,
    document.body
  );
}
