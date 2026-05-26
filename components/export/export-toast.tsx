"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";

type ExportToastProps = {
  message: string | null;
  onDismiss: () => void;
};

export function ExportToast({ message, onDismiss }: ExportToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-emerald-500/40",
        "bg-card px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
    >
      {message}
    </div>
  );
}
