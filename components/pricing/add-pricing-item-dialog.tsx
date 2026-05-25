"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  PricingFormFields,
  defaultPricingFormValues,
  parsePricingFormValues,
  takeoffItemToPricingFormDefaults,
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
import { createPricingItemAction } from "@/src/lib/pricing/actions";
import type { TakeoffItem } from "@/src/types/database";

type AddPricingItemDialogProps = {
  projectId: string;
  takeoffItems: TakeoffItem[];
  pricedTakeoffIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTakeoffItemId?: string | null;
  onSuccess?: (message: string) => void;
};

export function AddPricingItemDialog({
  projectId,
  takeoffItems,
  pricedTakeoffIds,
  open,
  onOpenChange,
  initialTakeoffItemId,
  onSuccess,
}: AddPricingItemDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<PricingFormValues>(defaultPricingFormValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableTakeoff = useMemo(
    () =>
      takeoffItems.filter(
        (item) => item.status !== "excluded" && !pricedTakeoffIds.has(item.id)
      ),
    [takeoffItems, pricedTakeoffIds]
  );

  const takeoffOptions = useMemo(
    () =>
      availableTakeoff.map((item) => ({
        id: item.id,
        label: `${item.item_name} · ${item.trade}`,
      })),
    [availableTakeoff]
  );

  useEffect(() => {
    if (!open) {
      setForm(defaultPricingFormValues);
      setErrorMessage(null);
      return;
    }

    if (initialTakeoffItemId) {
      const takeoff = takeoffItems.find((item) => item.id === initialTakeoffItemId);
      if (takeoff) {
        setForm({
          ...defaultPricingFormValues,
          ...takeoffItemToPricingFormDefaults(
            takeoff.id,
            takeoff.quantity,
            takeoff.unit
          ),
        });
      }
    }
  }, [open, initialTakeoffItemId, takeoffItems]);

  useEffect(() => {
    if (!form.takeoff_item_id) {
      return;
    }

    const takeoff = takeoffItems.find((item) => item.id === form.takeoff_item_id);
    if (!takeoff) {
      return;
    }

    setForm((current) => ({
      ...current,
      quantity: String(takeoff.quantity),
      unit: takeoff.unit,
    }));
  }, [form.takeoff_item_id, takeoffItems]);

  function updateField<K extends keyof PricingFormValues>(
    key: K,
    value: PricingFormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = parsePricingFormValues(form);
    if (parsed.error || !parsed.data) {
      setErrorMessage(parsed.error ?? "Invalid form.");
      return;
    }

    startTransition(async () => {
      const result = await createPricingItemAction(projectId, parsed.data!);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.("Pricing line added.");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add pricing item</DialogTitle>
          <DialogDescription>
            Price a takeoff line with cost rate, markup or margin, and sell
            totals.
          </DialogDescription>
        </DialogHeader>

        {availableTakeoff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All eligible takeoff lines already have pricing. Add more takeoff
            lines or edit existing pricing.
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <PricingFormFields
              form={form}
              onChange={updateField}
              disabled={isPending}
              idPrefix="add-pricing"
              showTakeoffSelect
              takeoffOptions={takeoffOptions}
              lockTakeoff={Boolean(initialTakeoffItemId)}
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
                {isPending ? "Saving…" : "Add pricing"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
