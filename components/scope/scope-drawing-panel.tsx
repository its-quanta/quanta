"use client";

import { memo } from "react";

import { AiReviewDocumentViewer } from "@/components/ai-review/ai-review-document-viewer";
import { ScopeAnnotationLayer } from "@/components/scope/scope-annotation-layer";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type ScopeDrawingPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  viewerDocumentId: string | null;
  viewerPage: number | null;
  drawingReferenceLabel: string | null;
  pageAnnotations: AiReviewItem[];
  selectedItemId: string | null;
  tradeFilter: string | null;
  confidenceFilter: "high" | "medium" | "low" | null;
  onSelectItem: (itemId: string) => void;
};

export const ScopeDrawingPanel = memo(function ScopeDrawingPanel({
  projectId,
  documents,
  documentPages,
  viewerDocumentId,
  viewerPage,
  drawingReferenceLabel,
  pageAnnotations,
  selectedItemId,
  tradeFilter,
  confidenceFilter,
  onSelectItem,
}: ScopeDrawingPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <AiReviewDocumentViewer
          projectId={projectId}
          items={[]}
          documents={documents}
          documentPages={documentPages}
          selectedItemId={null}
          showOverlayLayer={false}
          onToggleOverlay={() => {}}
          syncDocumentId={viewerDocumentId}
          syncPage={viewerPage}
          drawingReferenceLabel={drawingReferenceLabel}
        />
      </div>
      <ScopeAnnotationLayer
        pageAnnotations={pageAnnotations}
        selectedItemId={selectedItemId}
        tradeFilter={tradeFilter}
        confidenceFilter={confidenceFilter}
        onSelectItem={onSelectItem}
      />
    </div>
  );
});
