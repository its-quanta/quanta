import type { AiReviewItem, Document, TakeoffItem } from "@/src/types/database";

/** Normalised drawing reference fields for scope UI (stored on DB rows via existing columns). */
export type ScopeDrawingReference = {
  source_document_id: string | null;
  drawing_number: string | null;
  drawing_name: string | null;
  page_number: number | null;
};

export function resolveDrawingNumber(
  drawingReference: string | null | undefined,
  sheetNumber: string | null | undefined
): string | null {
  const ref = drawingReference?.trim();
  if (ref) {
    return ref;
  }
  const sheet = sheetNumber?.trim();
  return sheet || null;
}

export function resolveDrawingName(
  sourceDocumentId: string | null | undefined,
  documentsById: ReadonlyMap<string, Document>
): string | null {
  if (!sourceDocumentId) {
    return null;
  }
  const doc = documentsById.get(sourceDocumentId);
  return doc?.file_name?.trim() || null;
}

export function resolveSuggestionDrawingRef(
  item: AiReviewItem,
  documentsById: ReadonlyMap<string, Document>
): ScopeDrawingReference {
  return {
    source_document_id: item.source_document_id,
    drawing_number: resolveDrawingNumber(
      item.drawing_reference,
      item.sheet_number
    ),
    drawing_name: resolveDrawingName(item.source_document_id, documentsById),
    page_number: item.page_number,
  };
}

export function resolveTakeoffDrawingRef(
  item: TakeoffItem,
  documentsById: ReadonlyMap<string, Document>
): ScopeDrawingReference {
  return {
    source_document_id: item.source_document_id,
    drawing_number: resolveDrawingNumber(
      item.drawing_reference,
      item.sheet_number
    ),
    drawing_name: resolveDrawingName(item.source_document_id, documentsById),
    page_number: item.page_number,
  };
}

export function formatDrawingRefLine(ref: ScopeDrawingReference): string {
  const parts: string[] = [];
  if (ref.drawing_number) {
    parts.push(ref.drawing_number);
  }
  if (ref.drawing_name) {
    parts.push(ref.drawing_name);
  }
  if (ref.page_number != null) {
    parts.push(`p.${ref.page_number}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "No drawing linked";
}
