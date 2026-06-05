"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TakeoffDrawingReferenceFields,
  type DrawingReferenceFormValues,
} from "@/components/takeoff/takeoff-drawing-reference-fields";
import {
  MANUAL_TAKEOFF_STATUSES,
  resolveTradeValue,
  selectClassName,
  TAKEOFF_TRADES,
  TAKEOFF_UNITS,
} from "@/src/lib/takeoff/constants";
import {
  documentPageIdBelongsToDocument,
  resolvePageNumberFromSelection,
} from "@/src/lib/takeoff/drawing-reference";
import type {
  Document,
  DocumentPage,
  TakeoffItem,
  TakeoffItemStatus,
} from "@/src/types/database";

export type TakeoffFormValues = {
  trade: string;
  customTrade: string;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  customUnit: string;
  notes: string;
  status: TakeoffItemStatus;
} & DrawingReferenceFormValues;

export const defaultTakeoffFormValues: TakeoffFormValues = {
  trade: "General",
  customTrade: "",
  item_name: "",
  description: "",
  quantity: "0",
  unit: "each",
  customUnit: "",
  notes: "",
  status: "needs_review",
  source_document_id: "",
  document_page_id: "",
  drawing_reference: "",
  page_number: "",
  sheet_number: "",
  detail_reference: "",
  specification_reference: "",
};

type TakeoffFormFieldsProps = {
  form: TakeoffFormValues;
  onChange: <K extends keyof TakeoffFormValues>(
    key: K,
    value: TakeoffFormValues[K]
  ) => void;
  documents: Document[];
  documentPages: DocumentPage[];
  disabled?: boolean;
  idPrefix?: string;
  /** Show read-only confidence when editing AI-linked rows. */
  editingItem?: Pick<TakeoffItem, "ai_generated" | "confidence_score"> | null;
};

export function parseTakeoffFormValues(
  form: TakeoffFormValues,
  documentPages: DocumentPage[]
): {
  error?: string;
  data?: {
    trade: string;
    item_name: string;
    description: string | null;
    quantity: number;
    unit: string;
    drawing_reference: string | null;
    page_number: number | null;
    sheet_number: string | null;
    detail_reference: string | null;
    specification_reference: string | null;
    source_document_id: string | null;
    notes: string | null;
    status: TakeoffItemStatus;
  };
} {
  const itemName = form.item_name.trim();
  if (!itemName) {
    return { error: "Enter an item name." };
  }

  const quantity = Number(form.quantity);
  if (Number.isNaN(quantity) || quantity < 0) {
    return { error: "Quantity must be zero or greater." };
  }

  const pageRaw = form.page_number.trim();
  let manualPageNumber: number | null = null;
  if (pageRaw.length > 0) {
    const parsed = Number(pageRaw);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return { error: "Page number must be greater than zero." };
    }
    manualPageNumber = parsed;
  }

  const sourceDocumentId = form.source_document_id || null;
  const documentPageId = form.document_page_id || null;

  if (
    documentPageId &&
    !documentPageIdBelongsToDocument(
      documentPageId,
      sourceDocumentId,
      documentPages
    )
  ) {
    return { error: "Selected page does not match the source document." };
  }

  const unit =
    form.unit === "custom"
      ? form.customUnit.trim() || "each"
      : form.unit.trim() || "each";

  return {
    data: {
      trade: resolveTradeValue(form.trade, form.customTrade),
      item_name: itemName,
      description: form.description.trim() || null,
      quantity,
      unit,
      drawing_reference: form.drawing_reference.trim() || null,
      page_number: resolvePageNumberFromSelection(
        documentPageId,
        manualPageNumber,
        documentPages
      ),
      sheet_number: form.sheet_number.trim() || null,
      detail_reference: form.detail_reference.trim() || null,
      specification_reference: form.specification_reference.trim() || null,
      source_document_id: sourceDocumentId,
      notes: form.notes.trim() || null,
      status: form.status,
    },
  };
}

export function takeoffItemToFormValues(
  item: Pick<
    TakeoffItem,
    | "trade"
    | "item_name"
    | "description"
    | "quantity"
    | "unit"
    | "drawing_reference"
    | "page_number"
    | "sheet_number"
    | "detail_reference"
    | "specification_reference"
    | "notes"
    | "source_document_id"
    | "document_page_id"
    | "status"
  >,
  trades: readonly string[] = TAKEOFF_TRADES,
  units: readonly string[] = TAKEOFF_UNITS,
  documentPages: DocumentPage[] = []
): TakeoffFormValues {
  const tradeInList = trades.includes(item.trade as (typeof trades)[number]);
  const unitInList = units.includes(item.unit as (typeof units)[number]);

  const resolvedDocumentPageId =
    item.document_page_id ??
    (item.source_document_id && item.page_number != null
      ? (documentPages.find(
          (page) =>
            page.document_id === item.source_document_id &&
            page.page_number === item.page_number
        )?.id ?? "")
      : "");

  return {
    trade: tradeInList ? item.trade : "Other",
    customTrade: tradeInList ? "" : item.trade,
    item_name: item.item_name,
    description: item.description ?? "",
    quantity: String(item.quantity),
    unit: unitInList ? item.unit : "custom",
    customUnit: unitInList ? "" : item.unit,
    drawing_reference: item.drawing_reference ?? "",
    page_number:
      item.page_number === null || item.page_number === undefined
        ? ""
        : String(item.page_number),
    sheet_number: item.sheet_number ?? "",
    detail_reference: item.detail_reference ?? "",
    specification_reference: item.specification_reference ?? "",
    notes: item.notes ?? "",
    source_document_id: item.source_document_id ?? "",
    document_page_id: resolvedDocumentPageId,
    status: item.status === "ai_draft" ? "draft" : item.status,
  };
}

export function TakeoffFormFields({
  form,
  onChange,
  documents,
  documentPages,
  disabled = false,
  idPrefix = "takeoff",
  editingItem = null,
}: TakeoffFormFieldsProps) {
  const showCustomTrade = form.trade === "Other";
  const showCustomUnit = form.unit === "custom";

  const drawingValues: DrawingReferenceFormValues = {
    source_document_id: form.source_document_id,
    document_page_id: form.document_page_id,
    drawing_reference: form.drawing_reference,
    page_number: form.page_number,
    sheet_number: form.sheet_number,
    detail_reference: form.detail_reference,
    specification_reference: form.specification_reference,
  };

  function onDrawingChange<K extends keyof DrawingReferenceFormValues>(
    key: K,
    value: DrawingReferenceFormValues[K]
  ) {
    onChange(key, value);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-item-name`}>Item name</Label>
        <Input
          id={`${idPrefix}-item-name`}
          value={form.item_name}
          onChange={(event) => onChange("item_name", event.target.value)}
          placeholder="Partition wall — Type A"
          disabled={disabled}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-trade`}>Trade</Label>
        <select
          id={`${idPrefix}-trade`}
          className={selectClassName}
          value={form.trade}
          onChange={(event) => onChange("trade", event.target.value)}
          disabled={disabled}
        >
          {TAKEOFF_TRADES.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </select>
      </div>

      {showCustomTrade ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-custom-trade`}>Custom trade</Label>
          <Input
            id={`${idPrefix}-custom-trade`}
            value={form.customTrade}
            onChange={(event) => onChange("customTrade", event.target.value)}
            placeholder="Specify trade"
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
        <select
          id={`${idPrefix}-unit`}
          className={selectClassName}
          value={form.unit}
          onChange={(event) => onChange("unit", event.target.value)}
          disabled={disabled}
        >
          {TAKEOFF_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      {showCustomUnit ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-custom-unit`}>Custom unit</Label>
          <Input
            id={`${idPrefix}-custom-unit`}
            value={form.customUnit}
            onChange={(event) => onChange("customUnit", event.target.value)}
            placeholder="e.g. roll"
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-quantity`}>Quantity</Label>
          <Input
            id={`${idPrefix}-quantity`}
            type="number"
            min={0}
            step="any"
            className="font-mono tabular-nums"
            value={form.quantity}
            onChange={(event) => onChange("quantity", event.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {showCustomUnit ? (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-quantity`}>Quantity</Label>
          <Input
            id={`${idPrefix}-quantity`}
            type="number"
            min={0}
            step="any"
            className="font-mono tabular-nums"
            value={form.quantity}
            onChange={(event) => onChange("quantity", event.target.value)}
            disabled={disabled}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Input
          id={`${idPrefix}-description`}
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Scope detail"
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-status`}>Status</Label>
        <select
          id={`${idPrefix}-status`}
          className={selectClassName}
          value={form.status}
          onChange={(event) =>
            onChange("status", event.target.value as TakeoffItemStatus)
          }
          disabled={disabled}
        >
          {MANUAL_TAKEOFF_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden sm:block" aria-hidden />

      <div className="sm:col-span-2">
        <TakeoffDrawingReferenceFields
          values={drawingValues}
          onChange={onDrawingChange}
          documents={documents}
          documentPages={documentPages}
          disabled={disabled}
          idPrefix={`${idPrefix}-ref`}
          showConfidence={Boolean(editingItem?.ai_generated)}
          confidenceScore={editingItem?.confidence_score ?? null}
        />
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Input
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Internal note"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
