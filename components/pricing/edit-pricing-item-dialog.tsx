"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  PricingFormFields,
  parsePricingFormValues,
  pricingItemToFormValues,
  type PricingFormValues,
} from "@/components/pricing/pricing-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updatePricingItemAction } from "@/src/lib/pricing/actions";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";

type EditPricingItemDialogProps = {
  projectId: string;
  item: PricingItemWithTakeoff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
};

export function EditPricingItemDialog({
  projectId,
  item,
  open,
  onOpenChange,
  onSuccess,
}: EditPricingItemDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<PricingFormValues | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && item) {
      setForm(pricingItemToFormValues(item));
      setErrorMessage(null);
    }
  }, [open, item]);

  function updateField<K extends keyof PricingFormValues>(
    key: K,
    value: PricingFormValues[K]
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !form) {
      return;
    }

    setErrorMessage(null);

    const parsed = parsePricingFormValues(form);
    if (parsed.error || !parsed.data) {
      setErrorMessage(parsed.error ?? "Invalid form.");
      return;
    }

    const { takeoff_item_id: _takeoff, ...updates } = parsed.data;

    startTransition(async () => {
      const result = await updatePricingItemAction(item.id, projectId, updates);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.("Pricing updated.");
      router.refresh();
    });
  }

  if (!item || !form) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit pricing</DialogTitle>
          <DialogDescription>
            {item.takeoff_item.item_name} · {item.takeoff_item.trade}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <PricingFormFields
            form={form}
            onChange={updateField}
            disabled={isPending}
            idPrefix="edit-pricing"
          />

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

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
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
