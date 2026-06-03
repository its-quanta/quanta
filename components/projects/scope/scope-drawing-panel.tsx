"use client";

import { AiReviewDocumentViewer } from "@/components/ai-review/ai-review-document-viewer";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type ScopeDrawingPanelProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  selectedItemId: string | null;
  showOverlayLayer: boolean;
  onToggleOverlay: (show: boolean) => void;
};

export function ScopeDrawingPanel({
  projectId,
  items,
  documents,
  documentPages,
  selectedItemId,
  showOverlayLayer,
  onToggleOverlay,
}: ScopeDrawingPanelProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold">Drawing</h3>
        <p className="text-sm text-muted-foreground">
          Drawing evidence
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <AiReviewDocumentViewer
          projectId={projectId}
          items={items}
          documents={documents}
          documentPages={documentPages}
          selectedItemId={selectedItemId}
          showOverlayLayer={showOverlayLayer}
          onToggleOverlay={onToggleOverlay}
        />
      </div>
    </aside>
  );
}
