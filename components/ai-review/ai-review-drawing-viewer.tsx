"use client";

import { useMemo, useState } from "react";

import { AiReviewOverlayLayer } from "@/components/ai-review/ai-review-overlay-layer";
import { DocumentPreviewContent } from "@/components/documents/document-preview-content";
import { useDocumentSignedUrl } from "@/components/documents/use-document-signed-url";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type AiReviewDrawingViewerProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  selectedItemId: string | null;
  showOverlayLayer: boolean;
  onToggleOverlay: (show: boolean) => void;
};

export function AiReviewDrawingViewer({
  projectId,
  items,
  documents,
  documentPages,
  selectedItemId,
  showOverlayLayer,
  onToggleOverlay,
}: AiReviewDrawingViewerProps) {
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const [documentId, setDocumentId] = useState<string | null>(
    selectedItem?.source_document_id ?? documents[0]?.id ?? null
  );

  const activeDocumentId =
    selectedItem?.source_document_id ?? documentId ?? documents[0]?.id ?? null;

  const activeDocument = documents.find((doc) => doc.id === activeDocumentId);

  const { signedUrl, error, loading } = useDocumentSignedUrl(
    activeDocument?.id ?? null,
    projectId,
    Boolean(activeDocument)
  );

  const visibleOverlays = useMemo(() => {
    if (!activeDocumentId) {
      return [];
    }
    return items.filter(
      (item) =>
        item.source_document_id === activeDocumentId &&
        (selectedItem?.page_number == null ||
          item.page_number === selectedItem.page_number ||
          item.id === selectedItemId)
    );
  }, [activeDocumentId, items, selectedItem, selectedItemId]);

  const pageHint = selectedItem?.page_number ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <Label htmlFor="ai-review-document">Drawing</Label>
          <Select
            value={activeDocumentId ?? ""}
            onValueChange={(value) => setDocumentId(value)}
          >
            <SelectTrigger id="ai-review-document">
              <SelectValue placeholder="Select document" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.file_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border border-input accent-primary"
            checked={showOverlayLayer}
            onChange={(event) => onToggleOverlay(event.target.checked)}
          />
          Overlay layer
        </label>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/10">
        {documents.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Upload tender drawings to review AI suggestions with evidence.
          </div>
        ) : (
          <>
            <div className={cn("relative h-full min-h-[280px]")}>
              {activeDocument ? (
                <DocumentPreviewContent
                  document={activeDocument}
                  signedUrl={signedUrl}
                  loading={loading}
                  error={error}
                  pageNumberHint={pageHint}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Select a document
                </div>
              )}
              <AiReviewOverlayLayer
                items={visibleOverlays}
                selectedItemId={selectedItemId}
                showLayer={showOverlayLayer}
              />
            </div>
            {selectedItem?.drawing_reference ? (
              <p className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-0.5 font-mono text-xs text-muted-foreground shadow-sm">
                Ref {selectedItem.drawing_reference}
                {selectedItem.sheet_number
                  ? ` · ${selectedItem.sheet_number}`
                  : ""}
              </p>
            ) : null}
          </>
        )}
      </div>

      {activeDocument ? (
        <p className="text-xs text-muted-foreground">
          {drawingContext.documentNames.get(activeDocument.id) ??
            activeDocument.file_name}
          {pageHint != null ? ` · Page ${pageHint}` : ""}
        </p>
      ) : null}
    </div>
  );
}
