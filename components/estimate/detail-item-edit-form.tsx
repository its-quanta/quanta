"use client";

import { useEffect, useState, useTransition } from "react";

import {
  parseTakeoffFormValues,
  takeoffItemToFormValues,
  TakeoffFormFields,
  type TakeoffFormValues,
} from "@/components/takeoff/takeoff-form-fields";
import { Button } from "@/components/ui/button";
import { TAKEOFF_TRADES, TAKEOFF_UNITS } from "@/src/lib/takeoff/constants";
import { updateTakeoffItemAction } from "@/src/lib/takeoff/actions";
import type { Document, DocumentPage, TakeoffItem } from "@/src/types/database";

type DetailItemEditFormProps = {
  projectId: string;
  item: TakeoffItem;
  documents: Document[];
  documentPages: DocumentPage[];
  onSaved: (item: TakeoffItem) => void;
  onCancel: () => void;
  onError?: (message: string) => void;
};

export function DetailItemEditForm({
  projectId,
  item,
  documents,
  documentPages,
  onSaved,
  onCancel,
  onError,
}: DetailItemEditFormProps) {
  const [form, setForm] = useState<TakeoffFormValues>(() =>
    takeoffItemToFormValues(item, TAKEOFF_TRADES, TAKEOFF_UNITS, documentPages)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setForm(takeoffItemToFormValues(item, TAKEOFF_TRADES, TAKEOFF_UNITS, documentPages));
    setErrorMessage(null);
    setSaved(false);
  }, [item, documentPages]);

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
        status: parsed.data!.status,
      });

      if (result.error) {
        setErrorMessage(result.error);
        onError?.(result.error);
        return;
      }

      const updated: TakeoffItem = {
        ...item,
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
        status: parsed.data!.status,
        updated_at: new Date().toISOString(),
      };

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      onSaved(updated);
    });
  }

  return (
    <form className="space-y-4 border-b border-border pb-4" onSubmit={handleSubmit}>
      <TakeoffFormFields
        form={form}
        onChange={updateField}
        documents={documents}
        documentPages={documentPages}
        disabled={isPending}
        idPrefix="estimate-edit-item"
        editingItem={item}
      />

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {saved ? (
          <span className="text-xs text-emerald-700">Saved</span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
