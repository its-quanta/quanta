/** Canonical 1-based page for the scope PDF viewer (null = no valid page). */
export function normalizeViewerPage(
  page: number | null | undefined
): number | null {
  if (page == null) {
    return null;
  }
  const value = Number(page);
  if (!Number.isFinite(value) || value < 1) {
    return null;
  }
  return Math.floor(value);
}

export type ScopeViewerLinkFields = {
  source_document_id: string | null;
  page_number: number | null;
};

export function hasViewerDocumentLink(
  item: ScopeViewerLinkFields
): item is ScopeViewerLinkFields & { source_document_id: string } {
  return Boolean(item.source_document_id?.trim());
}

/** Apply document + page navigation from a suggestion or takeoff row. */
export function getViewerNavigationFromItem(item: ScopeViewerLinkFields): {
  documentId: string | null;
  page: number | null;
} {
  const documentId = item.source_document_id?.trim() || null;
  const page = normalizeViewerPage(item.page_number);
  return { documentId, page };
}
