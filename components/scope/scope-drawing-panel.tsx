"use client";

import { memo, useMemo } from "react";

import { ScopeDocumentViewer } from "@/components/scope/scope-document-viewer";
import {
  buildSuggestionPageMarkers,
  buildTakeoffPageMarkers,
} from "@/components/scope/scope-marker-positions";
import { ScopeOverlayMarkers } from "@/components/scope/scope-overlay-markers";
import { ScopeViewerSourceBar } from "@/components/scope/scope-viewer-source-bar";
import type { ScopePanelMode } from "@/components/scope/scope-panel-mode";
import type { AiReviewItem, Document, TakeoffItem } from "@/src/types/database";

type ScopeDrawingPanelProps = {
  projectId: string;
  documents: Document[];
  activeDocumentId: string | null;
  activePage: number | null;
  panelMode: ScopePanelMode;
  sourceBadge: {
    documentName: string;
    pageNumber: number | null;
    totalPages: number | null;
    drawingNumber: string | null;
    drawingName: string | null;
  };
  pageSuggestions: AiReviewItem[];
  pageTakeoffItems: TakeoffItem[];
  selectedSuggestionId: string | null;
  selectedTakeoffId: string | null;
  tradeFilter: string | null;
  confidenceFilter: "high" | "medium" | "low" | null;
  onSelectSuggestion: (itemId: string) => void;
  onSelectTakeoff: (itemId: string) => void;
  renderPdf?: boolean;
  onOpenFullscreen?: () => void;
  showFullscreenButton?: boolean;
  className?: string;
};

const ScopeDrawingCanvas = memo(function ScopeDrawingCanvas({
  projectId,
  activeDocument,
  activePage,
}: {
  projectId: string;
  activeDocument: Document | null;
  activePage: number | null;
}) {
  return (
    <ScopeDocumentViewer
      projectId={projectId}
      document={activeDocument}
      activePage={activePage}
    />
  );
});

export const ScopeDrawingPanel = memo(function ScopeDrawingPanel({
  projectId,
  documents,
  activeDocumentId,
  activePage,
  panelMode,
  sourceBadge,
  pageSuggestions,
  pageTakeoffItems,
  selectedSuggestionId,
  selectedTakeoffId,
  tradeFilter,
  confidenceFilter,
  onSelectSuggestion,
  onSelectTakeoff,
  renderPdf = true,
  onOpenFullscreen,
  showFullscreenButton = true,
}: ScopeDrawingPanelProps) {
  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId) ?? null,
    [documents, activeDocumentId]
  );

  const markers = useMemo(() => {
    if (panelMode === "takeoff") {
      return buildTakeoffPageMarkers(
        pageTakeoffItems,
        selectedTakeoffId,
        tradeFilter
      );
    }
    return buildSuggestionPageMarkers(
      pageSuggestions,
      selectedSuggestionId,
      tradeFilter,
      confidenceFilter
    );
  }, [
    panelMode,
    pageSuggestions,
    pageTakeoffItems,
    selectedSuggestionId,
    selectedTakeoffId,
    tradeFilter,
    confidenceFilter,
  ]);

  const onSelectMarker = panelMode === "takeoff" ? onSelectTakeoff : onSelectSuggestion;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ScopeViewerSourceBar
        documentName={sourceBadge.documentName}
        pageNumber={sourceBadge.pageNumber}
        totalPages={sourceBadge.totalPages}
        drawingReference={sourceBadge.drawingNumber}
        sheetNumber={sourceBadge.drawingName}
        onFullscreen={
          showFullscreenButton && onOpenFullscreen ? onOpenFullscreen : undefined
        }
        fullscreenLabel="Fullscreen"
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {renderPdf ? (
          <>
            <div className="h-full min-h-0 flex-1 overflow-hidden">
              <ScopeDrawingCanvas
                projectId={projectId}
                activeDocument={activeDocument}
                activePage={activePage}
              />
            </div>
            <ScopeOverlayMarkers markers={markers} onSelectItem={onSelectMarker} />
          </>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center bg-muted/15 px-4 text-center text-sm text-muted-foreground">
            Drawing is open in fullscreen review.
          </div>
        )}
      </div>
    </div>
  );
});
