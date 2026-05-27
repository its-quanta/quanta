"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";

type ImportToastProps = {
  message: string | null;
  variant?: "success" | "error";
  onDismiss: () => void;
};

export function ImportToast({
  message,
  variant = "success",
  onDismiss,
}: ImportToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 right-6 z-50 max-w-md rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
        variant === "success"
          ? "border-emerald-500/40 bg-card text-emerald-800"
          : "border-destructive/40 bg-card text-destructive"
      )}
    >
      {message}
    </div>
  );
}
