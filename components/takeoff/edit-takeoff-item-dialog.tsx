"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  TakeoffFormFields,
  defaultTakeoffFormValues,
  parseTakeoffFormValues,
  takeoffItemToFormValues,
  type TakeoffFormValues,
} from "@/components/takeoff/takeoff-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateTakeoffItemAction } from "@/src/lib/takeoff/actions";
import type { Document, DocumentPage, TakeoffItem } from "@/src/types/database";

type EditTakeoffItemDialogProps = {
  projectId: string;
  item: TakeoffItem | null;
  documents: Document[];
  documentPages: DocumentPage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
};

export function EditTakeoffItemDialog({
  projectId,
  item,
  documents,
  documentPages,
  open,
  onOpenChange,
  onSuccess,
}: EditTakeoffItemDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<TakeoffFormValues>(defaultTakeoffFormValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && item) {
      setForm(takeoffItemToFormValues(item));
      setErrorMessage(null);
    }
  }, [open, item]);

  function updateField<K extends keyof TakeoffFormValues>(
    key: K,
    value: TakeoffFormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = parseTakeoffFormValues(form, documentPages);
    if (parsed.error || !parsed.data) {
      setErrorMessage(parsed.error ?? "Invalid form.");
      return;
    }

    if (!item) {
      return;
    }

    startTransition(async () => {
      const result = await updateTakeoffItemAction(item.id, projectId, {
        trade: parsed.data!.trade,
        item_name: parsed.data!.item_name,
        description: parsed.data!.description,
        quantity: parsed.data!.quantity,
        unit: parsed.data!.unit,
        drawing_reference: parsed.data!.drawing_reference,
        page_number: parsed.data!.page_number,
        sheet_number: parsed.data!.sheet_number,
        detail_reference: parsed.data!.detail_reference,
        specification_reference: parsed.data!.specification_reference,
        notes: parsed.data!.notes,
        source_document_id: parsed.data!.source_document_id,
        document_page_id: parsed.data!.document_page_id,
        status: parsed.data!.status,
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.(`${parsed.data!.item_name} updated.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit takeoff item</DialogTitle>
          <DialogDescription>
            Update scope line details. Changes save when you submit.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TakeoffFormFields
            form={form}
            onChange={updateField}
            documents={documents}
            documentPages={documentPages}
            disabled={isPending || !item}
            idPrefix="edit-takeoff"
            editingItem={item}
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
            <Button type="submit" disabled={isPending || !item}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
