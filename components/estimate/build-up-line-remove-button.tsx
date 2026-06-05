"use client";

import { useState, useTransition } from "react";

import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BuildUpLineRemoveButtonProps = {
  projectId: string;
  ariaLabel: string;
  onRemove: (projectId: string, itemIds: string[]) => Promise<{ error?: string }>;
  itemId: string;
  onOptimisticRemove?: (itemId: string) => void;
  onRemoved?: () => void;
  onError?: (message: string) => void;
  className?: string;
};

export function BuildUpLineRemoveButton({
  projectId,
  ariaLabel,
  onRemove,
  itemId,
  onOptimisticRemove,
  onRemoved,
  onError,
  className,
}: BuildUpLineRemoveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await onRemove(projectId, [itemId]);
      setConfirming(false);

      if (result.error) {
        onError?.(result.error);
        return;
      }

      onOptimisticRemove?.(itemId);
      dispatchEstimateUpdated(projectId);
      onRemoved?.();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-6 shrink-0 text-muted-foreground hover:text-destructive",
        confirming && "text-destructive",
        className
      )}
      disabled={isPending}
      aria-label={confirming ? `Confirm ${ariaLabel}` : ariaLabel}
      title={confirming ? "Click again to confirm remove" : ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        handleRemove();
      }}
    >
      {isPending ? "…" : confirming ? "✓" : "✕"}
    </Button>
  );
}
