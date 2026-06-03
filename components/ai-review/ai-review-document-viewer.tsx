"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { AiReviewOverlayLayer } from "@/components/ai-review/ai-review-overlay-layer";
import { DocumentPreviewContent } from "@/components/documents/document-preview-content";
import { useDocumentSignedUrl } from "@/components/documents/use-document-signed-url";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getDocumentPreviewKind } from "@/src/lib/documents/preview";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

const ZOOM_LEVELS = [75, 100, 125, 150, 200] as const;

type AiReviewDocumentViewerProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  selectedItemId: string | null;
  showOverlayLayer: boolean;
  onToggleOverlay: (show: boolean) => void;
  /** When set, document/page follow these props instead of selectedItemId. */
  syncDocumentId?: string | null;
  syncPage?: number | null;
  drawingReferenceLabel?: string | null;
};

function AiReviewDocumentViewerInner({
  projectId,
  items,
  documents,
  documentPages,
  selectedItemId,
  showOverlayLayer,
  onToggleOverlay,
  syncDocumentId,
  syncPage,
  drawingReferenceLabel,
}: AiReviewDocumentViewerProps) {
  const usesExternalNavigation = syncDocumentId !== undefined;

  const selectedItem = useMemo(
    () =>
      usesExternalNavigation
        ? null
        : items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId, usesExternalNavigation]
  );

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const drawingDocuments = useMemo(
    () =>
      documents.filter(
        (doc) => getDocumentPreviewKind(doc.file_type) === "pdf" || getDocumentPreviewKind(doc.file_type) === "image"
      ),
    [documents]
  );

  const [documentId, setDocumentId] = useState<string | null>(
    syncDocumentId ??
      selectedItem?.source_document_id ??
      drawingDocuments[0]?.id ??
      null
  );
  const [compareDocumentId, setCompareDocumentId] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [activePage, setActivePage] = useState<number | null>(
    syncPage ?? selectedItem?.page_number ?? null
  );
  const [zoom, setZoom] = useState<(typeof ZOOM_LEVELS)[number]>(100);

  const activeDocumentId = usesExternalNavigation
    ? syncDocumentId ?? documentId ?? drawingDocuments[0]?.id ?? null
    : selectedItem?.source_document_id ?? documentId ?? drawingDocuments[0]?.id ?? null;

  const activeDocument = documents.find((doc) => doc.id === activeDocumentId);
  const compareDocument = documents.find((doc) => doc.id === compareDocumentId);

  useEffect(() => {
    if (usesExternalNavigation) {
      if (syncDocumentId != null) {
        setDocumentId(syncDocumentId);
      }
      if (syncPage != null) {
        setActivePage(syncPage);
      }
      return;
    }
    if (selectedItem?.source_document_id) {
      setDocumentId(selectedItem.source_document_id);
    }
    if (selectedItem?.page_number != null) {
      setActivePage(selectedItem.page_number);
    }
  }, [
    usesExternalNavigation,
    syncDocumentId,
    syncPage,
    selectedItem?.id,
    selectedItem?.source_document_id,
    selectedItem?.page_number,
  ]);

  const pagesForDocument = useMemo(() => {
    if (!activeDocumentId) {
      return [];
    }
    return documentPages
      .filter((page) => page.document_id === activeDocumentId)
      .sort((a, b) => a.page_number - b.page_number);
  }, [activeDocumentId, documentPages]);

  const { signedUrl, error, loading } = useDocumentSignedUrl(
    activeDocument?.id ?? null,
    projectId,
    Boolean(activeDocument)
  );

  const compareSigned = useDocumentSignedUrl(
    compareDocument?.id ?? null,
    projectId,
    compareEnabled && Boolean(compareDocument)
  );

  const previewUrl = useMemo(() => {
    if (!signedUrl) {
      return null;
    }
    if (activePage == null || getDocumentPreviewKind(activeDocument?.file_type ?? "") !== "pdf") {
      return signedUrl;
    }
    return `${signedUrl}#page=${activePage}`;
  }, [signedUrl, activePage, activeDocument?.file_type]);

  const visibleOverlays = useMemo(() => {
    if (!activeDocumentId) {
      return [];
    }
    return items.filter(
      (item) =>
        item.source_document_id === activeDocumentId &&
        (activePage == null ||
          item.page_number === activePage ||
          item.id === selectedItemId)
    );
  }, [activeDocumentId, activePage, items, selectedItemId]);

  function renderCanvas(
    document: Document | undefined,
    url: string | null,
    loadingState: boolean,
    errorState: string | null,
    page: number | null
  ) {
    if (!document) {
      return (
        <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">
          Select a document
        </div>
      );
    }

    const pageUrl =
      url && page != null && getDocumentPreviewKind(document.file_type) === "pdf"
        ? `${url.split("#")[0]}#page=${page}`
        : url;

    return (
      <div className="relative min-h-[320px]">
        <div
          className="origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%` }}
        >
          <DocumentPreviewContent
            document={document}
            signedUrl={pageUrl}
            loading={loadingState}
            error={errorState}
            pageNumberHint={page}
          />
        </div>
        <AiReviewOverlayLayer
          items={visibleOverlays}
          selectedItemId={selectedItemId}
          showLayer={showOverlayLayer}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1 space-y-1">
          <Label htmlFor="ai-review-doc-select" className="text-xs">
            Document
          </Label>
          <Select
            value={activeDocumentId ?? ""}
            onValueChange={(value) => {
              setDocumentId(value);
              setActivePage(null);
            }}
          >
            <SelectTrigger id="ai-review-doc-select" className="h-8">
              <SelectValue placeholder="Select document" />
            </SelectTrigger>
            <SelectContent>
              {drawingDocuments.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.file_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {ZOOM_LEVELS.map((level) => (
            <Button
              key={level}
              type="button"
              size="sm"
              variant={zoom === level ? "secondary" : "ghost"}
              className="h-8 px-2 font-mono text-xs tabular-nums"
              onClick={() => setZoom(level)}
            >
              {level}%
            </Button>
          ))}
        </div>

        <label className="flex h-8 items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="size-3.5 rounded border border-input accent-primary"
            checked={showOverlayLayer}
            onChange={(event) => onToggleOverlay(event.target.checked)}
          />
          Overlay
        </label>

        <label className="flex h-8 items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="size-3.5 rounded border border-input accent-primary"
            checked={compareEnabled}
            onChange={(event) => setCompareEnabled(event.target.checked)}
          />
          Compare
        </label>
      </div>

      {compareEnabled ? (
        <div className="min-w-[8rem] space-y-1">
          <Label className="text-xs">Compare drawing</Label>
          <Select
            value={compareDocumentId ?? ""}
            onValueChange={(value) => setCompareDocumentId(value || null)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Second drawing (optional)" />
            </SelectTrigger>
            <SelectContent>
              {drawingDocuments
                .filter((doc) => doc.id !== activeDocumentId)
                .map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.file_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden rounded-lg border border-border bg-muted/10">
        {pagesForDocument.length > 0 ? (
          <aside className="flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-background/80 p-1">
            {pagesForDocument.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePage(page.page_number)}
                className={cn(
                  "rounded px-1 py-1.5 font-mono text-[10px] tabular-nums transition-colors",
                  activePage === page.page_number
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
                title={page.sheet_title ?? `Page ${page.page_number}`}
              >
                {page.page_number}
              </button>
            ))}
          </aside>
        ) : activePage != null ? (
          <aside className="flex w-16 shrink-0 flex-col gap-1 border-r border-border bg-background/80 p-1">
            <button
              type="button"
              className="rounded bg-primary px-1 py-1.5 font-mono text-[10px] text-primary-foreground tabular-nums"
            >
              {activePage}
            </button>
          </aside>
        ) : null}

        <div
          className={cn(
            "grid min-h-0 flex-1 overflow-auto",
            compareEnabled && compareDocument ? "grid-cols-2 divide-x divide-border" : "grid-cols-1"
          )}
        >
          <div className="relative min-h-[360px] overflow-auto p-2">
            {drawingDocuments.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Upload PDF drawings under Plans &amp; specs to review here.
              </div>
            ) : (
              renderCanvas(activeDocument, previewUrl, loading, error, activePage)
            )}
          </div>
          {compareEnabled && compareDocument ? (
            <div className="relative min-h-[360px] overflow-auto p-2">
              {renderCanvas(
                compareDocument,
                compareSigned.signedUrl,
                compareSigned.loading,
                compareSigned.error,
                activePage
              )}
            </div>
          ) : null}
        </div>
      </div>

      {activeDocument ? (
        <p className="text-xs text-muted-foreground">
          {drawingContext.documentNames.get(activeDocument.id) ??
            activeDocument.file_name}
          {activePage != null ? ` · Page ${activePage}` : ""}
          {drawingReferenceLabel
            ? ` · Ref ${drawingReferenceLabel}`
            : selectedItem?.drawing_reference
              ? ` · Ref ${selectedItem.drawing_reference}`
              : ""}
        </p>
      ) : null}
    </div>
  );
}

function viewerPropsAreEqual(
  prev: AiReviewDocumentViewerProps,
  next: AiReviewDocumentViewerProps
): boolean {
  return (
    prev.projectId === next.projectId &&
    prev.documents === next.documents &&
    prev.documentPages === next.documentPages &&
    prev.showOverlayLayer === next.showOverlayLayer &&
    prev.onToggleOverlay === next.onToggleOverlay &&
    prev.syncDocumentId === next.syncDocumentId &&
    prev.syncPage === next.syncPage &&
    prev.drawingReferenceLabel === next.drawingReferenceLabel &&
    (prev.syncDocumentId !== undefined ||
      (prev.selectedItemId === next.selectedItemId && prev.items === next.items))
  );
}

export const AiReviewDocumentViewer = memo(
  AiReviewDocumentViewerInner,
  viewerPropsAreEqual
);
