"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EstimateToastProps = {
  message: string | null;
  variant?: "success" | "error";
  undoLabel?: string;
  onUndo?: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

export function EstimateToast({
  message,
  variant = "success",
  undoLabel = "Undo",
  onUndo,
  onDismiss,
  durationMs = 5000,
}: EstimateToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
        variant === "success"
          ? "border-emerald-500/40 bg-card text-foreground"
          : "border-destructive/40 bg-card text-destructive"
      )}
    >
      <span className="flex-1">{message}</span>
      {onUndo ? (
        <Button type="button" size="sm" variant="outline" onClick={onUndo}>
          {undoLabel}
        </Button>
      ) : null}
    </div>
  );
}
