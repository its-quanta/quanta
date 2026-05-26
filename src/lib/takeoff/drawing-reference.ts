import type { DocumentPage, TakeoffItem } from "@/src/types/database";

export type DrawingReferenceContext = {
  documentNames: Map<string, string>;
  pagesById: Map<string, DocumentPage>;
};

export function buildDrawingReferenceContext(
  documents: { id: string; file_name: string }[],
  pages: DocumentPage[]
): DrawingReferenceContext {
  return {
    documentNames: new Map(documents.map((document) => [document.id, document.file_name])),
    pagesById: new Map(pages.map((page) => [page.id, page])),
  };
}

export function formatSourceDocumentFileName(
  item: Pick<TakeoffItem, "source_document_id">,
  context: DrawingReferenceContext
): string {
  if (!item.source_document_id) {
    return "—";
  }

  return (
    context.documentNames.get(item.source_document_id) ?? "Unknown document"
  );
}

/** Primary line for table display (structured refs preferred over free text alone). */
export function formatDrawingReferencePrimary(
  item: Pick<
    TakeoffItem,
    | "source_document_id"
    | "document_page_id"
    | "drawing_reference"
    | "sheet_number"
    | "page_number"
  >,
  context: DrawingReferenceContext
): string {
  const parts: string[] = [];

  if (item.drawing_reference?.trim()) {
    parts.push(item.drawing_reference.trim());
  }

  if (item.sheet_number?.trim()) {
    parts.push(`Sheet ${item.sheet_number.trim()}`);
  }

  if (item.page_number !== null && item.page_number !== undefined) {
    parts.push(`p.${item.page_number}`);
  }

  const linkedPage = item.document_page_id
    ? context.pagesById.get(item.document_page_id)
    : undefined;

  if (linkedPage) {
    const pageLabel = linkedPage.sheet_number
      ? `Page ${linkedPage.page_number} (${linkedPage.sheet_number})`
      : `Page ${linkedPage.page_number}`;
    parts.push(pageLabel);
  }

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return "—";
}

/** Secondary line: document link and spec/detail refs. */
export function formatDrawingReferenceSecondary(
  item: Pick<
    TakeoffItem,
    | "source_document_id"
    | "detail_reference"
    | "specification_reference"
    | "confidence_score"
    | "ai_generated"
  >,
  context: DrawingReferenceContext
): string | null {
  const parts: string[] = [];

  if (item.source_document_id) {
    const name =
      context.documentNames.get(item.source_document_id) ?? "Linked document";
    parts.push(name);
  } else {
    parts.push("No document linked");
  }

  if (item.detail_reference?.trim()) {
    parts.push(`Detail ${item.detail_reference.trim()}`);
  }

  if (item.specification_reference?.trim()) {
    parts.push(`Spec ${item.specification_reference.trim()}`);
  }

  if (item.ai_generated && item.confidence_score !== null) {
    parts.push(`${(item.confidence_score * 100).toFixed(0)}% confidence`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function drawingReferenceSearchText(
  item: Pick<
    TakeoffItem,
    | "drawing_reference"
    | "sheet_number"
    | "detail_reference"
    | "specification_reference"
    | "page_number"
    | "notes"
    | "item_name"
    | "description"
  >
): string {
  return [
    item.item_name,
    item.description,
    item.drawing_reference,
    item.sheet_number,
    item.detail_reference,
    item.specification_reference,
    item.page_number !== null ? String(item.page_number) : null,
    item.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function pagesForDocument(
  pages: DocumentPage[],
  documentId: string | null | undefined
): DocumentPage[] {
  if (!documentId) {
    return [];
  }

  return pages.filter((page) => page.document_id === documentId);
}

export function resolvePageNumberFromSelection(
  documentPageId: string | null,
  manualPageNumber: number | null,
  pages: DocumentPage[]
): number | null {
  if (documentPageId) {
    const page = pages.find((entry) => entry.id === documentPageId);
    if (page) {
      return page.page_number;
    }
  }

  return manualPageNumber;
}

export function documentPageIdBelongsToDocument(
  documentPageId: string | null,
  sourceDocumentId: string | null,
  pages: DocumentPage[]
): boolean {
  if (!documentPageId) {
    return true;
  }

  if (!sourceDocumentId) {
    return false;
  }

  const page = pages.find((entry) => entry.id === documentPageId);
  return page?.document_id === sourceDocumentId;
}
