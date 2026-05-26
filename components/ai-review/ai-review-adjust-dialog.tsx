"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adjustAiReviewItemAction } from "@/src/lib/ai-review/actions";
import type { AiReviewItem } from "@/src/types/database";

type AiReviewAdjustDialogProps = {
  item: AiReviewItem | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AiReviewAdjustDialog({
  item,
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: AiReviewAdjustDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item || !open) {
      return;
    }
    setDescription(item.description);
    setTrade(item.trade);
    setQuantity(String(item.quantity));
    setUnit(item.unit);
    setNotes(item.review_notes ?? "");
    setError(null);
  }, [item, open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) {
      return;
    }

    const parsedQuantity = Number.parseFloat(quantity);
    if (Number.isNaN(parsedQuantity)) {
      setError("Enter a valid quantity.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await adjustAiReviewItemAction(item.id, projectId, {
        description: description.trim(),
        trade: trade.trim(),
        quantity: parsedQuantity,
        unit: unit.trim(),
        review_notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adjust suggestion</DialogTitle>
            <DialogDescription>
              Edit the line before accepting. Status will be marked as adjusted.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ai-adjust-description">Description</Label>
              <Input
                id="ai-adjust-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ai-adjust-trade">Trade</Label>
                <Input
                  id="ai-adjust-trade"
                  value={trade}
                  onChange={(event) => setTrade(event.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ai-adjust-unit">Unit</Label>
                <Input
                  id="ai-adjust-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ai-adjust-quantity">Quantity</Label>
              <Input
                id="ai-adjust-quantity"
                type="number"
                min={0}
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ai-adjust-notes">Notes</Label>
              <Textarea
                id="ai-adjust-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isPending}
                rows={3}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
