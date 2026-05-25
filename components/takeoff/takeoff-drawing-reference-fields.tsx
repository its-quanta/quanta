"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectClassName } from "@/src/lib/takeoff/constants";
import { pagesForDocument } from "@/src/lib/takeoff/drawing-reference";
import type { Document, DocumentPage } from "@/src/types/database";

export type DrawingReferenceFormValues = {
  source_document_id: string;
  document_page_id: string;
  drawing_reference: string;
  page_number: string;
  sheet_number: string;
  detail_reference: string;
  specification_reference: string;
};

export const defaultDrawingReferenceFormValues: DrawingReferenceFormValues = {
  source_document_id: "",
  document_page_id: "",
  drawing_reference: "",
  page_number: "",
  sheet_number: "",
  detail_reference: "",
  specification_reference: "",
};

type TakeoffDrawingReferenceFieldsProps = {
  values: DrawingReferenceFormValues;
  onChange: <K extends keyof DrawingReferenceFormValues>(
    key: K,
    value: DrawingReferenceFormValues[K]
  ) => void;
  documents: Document[];
  documentPages: DocumentPage[];
  disabled?: boolean;
  idPrefix?: string;
  showConfidence?: boolean;
  confidenceScore?: number | null;
};

export function TakeoffDrawingReferenceFields({
  values,
  onChange,
  documents,
  documentPages,
  disabled = false,
  idPrefix = "takeoff-ref",
  showConfidence = false,
  confidenceScore = null,
}: TakeoffDrawingReferenceFieldsProps) {
  const pagesForSource = pagesForDocument(
    documentPages,
    values.source_document_id || null
  );

  function handleDocumentChange(documentId: string) {
    onChange("source_document_id", documentId);
    onChange("document_page_id", "");
  }

  function handlePageChange(pageId: string) {
    onChange("document_page_id", pageId);
    if (pageId) {
      const page = documentPages.find((entry) => entry.id === pageId);
      if (page) {
        onChange("page_number", String(page.page_number));
        if (page.sheet_number && !values.sheet_number.trim()) {
          onChange("sheet_number", page.sheet_number);
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/15 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Drawing reference</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Link to a source document and structured sheet/detail/spec references.
          Drawing number and page remain editable for manual takeoff.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-source-document`}>Source document</Label>
          <select
            id={`${idPrefix}-source-document`}
            className={selectClassName}
            value={values.source_document_id}
            onChange={(event) => handleDocumentChange(event.target.value)}
            disabled={disabled}
          >
            <option value="">No document linked</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.file_name}
              </option>
            ))}
          </select>
        </div>

        {pagesForSource.length > 0 ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-document-page`}>Document page</Label>
            <select
              id={`${idPrefix}-document-page`}
              className={selectClassName}
              value={values.document_page_id}
              onChange={(event) => handlePageChange(event.target.value)}
              disabled={disabled || !values.source_document_id}
            >
              <option value="">No indexed page selected</option>
              {pagesForSource.map((page) => (
                <option key={page.id} value={page.id}>
                  Page {page.page_number}
                  {page.sheet_number ? ` · ${page.sheet_number}` : ""}
                  {page.sheet_title ? ` — ${page.sheet_title}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Indexed pages link this line to a specific sheet when available.
            </p>
          </div>
        ) : values.source_document_id ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            No indexed pages for this document yet. Use page number below, or
            re-index when document processing is available.
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-drawing-ref`}>Drawing reference</Label>
          <Input
            id={`${idPrefix}-drawing-ref`}
            value={values.drawing_reference}
            onChange={(event) =>
              onChange("drawing_reference", event.target.value)
            }
            placeholder="A-302"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-sheet-number`}>Sheet number</Label>
          <Input
            id={`${idPrefix}-sheet-number`}
            value={values.sheet_number}
            onChange={(event) => onChange("sheet_number", event.target.value)}
            placeholder="S-101"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-page`}>Page number</Label>
          <Input
            id={`${idPrefix}-page`}
            type="number"
            min={1}
            step={1}
            className="font-mono tabular-nums"
            value={values.page_number}
            onChange={(event) => onChange("page_number", event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-detail-ref`}>Detail reference</Label>
          <Input
            id={`${idPrefix}-detail-ref`}
            value={values.detail_reference}
            onChange={(event) =>
              onChange("detail_reference", event.target.value)
            }
            placeholder="Detail 3 / Section A-A"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-spec-ref`}>Specification reference</Label>
          <Input
            id={`${idPrefix}-spec-ref`}
            value={values.specification_reference}
            onChange={(event) =>
              onChange("specification_reference", event.target.value)
            }
            placeholder="Spec §08.21"
            disabled={disabled}
          />
        </div>

        {showConfidence && confidenceScore !== null ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Confidence score</Label>
            <p className="font-mono text-sm tabular-nums text-muted-foreground">
              {(confidenceScore * 100).toFixed(0)}% — set by AI draft workflow
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
