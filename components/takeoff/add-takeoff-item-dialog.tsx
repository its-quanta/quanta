"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import {
  createTakeoffItemAction,
  type CreateTakeoffItemInput,
} from "@/src/lib/takeoff/actions";
import {
  selectClassName,
  TAKEOFF_TRADES,
  TAKEOFF_UNITS,
} from "@/src/lib/takeoff/constants";
import type { Document } from "@/src/types/database";

type AddTakeoffItemDialogProps = {
  projectId: string;
  documents: Document[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
};

const defaultForm = {
  trade: "General",
  item_name: "",
  description: "",
  quantity: "0",
  unit: "each",
  drawing_reference: "",
  page_number: "",
  notes: "",
  source_document_id: "",
};

export function AddTakeoffItemDialog({
  projectId,
  documents,
  open,
  onOpenChange,
  onSuccess,
}: AddTakeoffItemDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setForm(defaultForm);
      setErrorMessage(null);
    }
  }, [open]);

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const itemName = form.item_name.trim();
    if (!itemName) {
      setErrorMessage("Enter an item name.");
      return;
    }

    const quantity = Number(form.quantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      setErrorMessage("Quantity must be zero or greater.");
      return;
    }

    const pageRaw = form.page_number.trim();
    let pageNumber: number | null = null;
    if (pageRaw.length > 0) {
      const parsed = Number(pageRaw);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setErrorMessage("Page number must be greater than zero.");
        return;
      }
      pageNumber = parsed;
    }

    const input: CreateTakeoffItemInput = {
      trade: form.trade.trim() || "General",
      item_name: itemName,
      description: form.description.trim() || null,
      quantity,
      unit: form.unit.trim() || "each",
      drawing_reference: form.drawing_reference.trim() || null,
      page_number: pageNumber,
      notes: form.notes.trim() || null,
      source_document_id: form.source_document_id || null,
    };

    startTransition(async () => {
      const result = await createTakeoffItemAction(projectId, input);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.(`${itemName} added to takeoff.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add takeoff item</DialogTitle>
          <DialogDescription>
            Enter quantity line details. You can refine fields in the table
            after saving.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="takeoff-item-name">Item name</Label>
              <Input
                id="takeoff-item-name"
                value={form.item_name}
                onChange={(event) =>
                  updateField("item_name", event.target.value)
                }
                placeholder="Partition wall — Type A"
                disabled={isPending}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="takeoff-trade">Trade</Label>
              <select
                id="takeoff-trade"
                className={selectClassName}
                value={form.trade}
                onChange={(event) => updateField("trade", event.target.value)}
                disabled={isPending}
              >
                {TAKEOFF_TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="takeoff-unit">Unit</Label>
              <select
                id="takeoff-unit"
                className={selectClassName}
                value={form.unit}
                onChange={(event) => updateField("unit", event.target.value)}
                disabled={isPending}
              >
                {TAKEOFF_UNITS.filter((unit) => unit !== "custom").map(
                  (unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="takeoff-quantity">Quantity</Label>
              <Input
                id="takeoff-quantity"
                type="number"
                min={0}
                step="any"
                className="font-mono tabular-nums"
                value={form.quantity}
                onChange={(event) =>
                  updateField("quantity", event.target.value)
                }
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="takeoff-description">Description</Label>
              <Input
                id="takeoff-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Scope detail"
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="takeoff-drawing-ref">Drawing reference</Label>
              <Input
                id="takeoff-drawing-ref"
                value={form.drawing_reference}
                onChange={(event) =>
                  updateField("drawing_reference", event.target.value)
                }
                placeholder="A-302"
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="takeoff-page">Page number</Label>
              <Input
                id="takeoff-page"
                type="number"
                min={1}
                step={1}
                className="font-mono tabular-nums"
                value={form.page_number}
                onChange={(event) =>
                  updateField("page_number", event.target.value)
                }
                disabled={isPending}
              />
            </div>

            {documents.length > 0 ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="takeoff-source-document">Linked document</Label>
                <select
                  id="takeoff-source-document"
                  className={selectClassName}
                  value={form.source_document_id}
                  onChange={(event) =>
                    updateField("source_document_id", event.target.value)
                  }
                  disabled={isPending}
                >
                  <option value="">No linked document</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.file_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="takeoff-notes">Notes</Label>
              <Input
                id="takeoff-notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Internal note"
                disabled={isPending}
              />
            </div>
          </div>

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
              {isPending ? "Adding…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
