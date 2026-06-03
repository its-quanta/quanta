"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AiReviewAdjustDialog } from "@/components/ai-review/ai-review-adjust-dialog";
import { ImportToast } from "@/components/imports/import-toast";
import { ScopeAnnotationCallout } from "@/components/scope/scope-annotation-callout";
import { ScopeDrawingPanel } from "@/components/scope/scope-drawing-panel";
import {
  isPendingReviewStatus,
  selectNextPendingId,
} from "@/components/scope/scope-review-utils";
import { ScopeStatusBar } from "@/components/scope/scope-status-bar";
import { ScopeSuggestionRow } from "@/components/scope/scope-suggestion-row";
import { ScopeSuggestionsQueueHeader } from "@/components/scope/scope-suggestions-queue-header";
import { ScopeToolbar } from "@/components/scope/scope-toolbar";
import { useOptimisticSuggestions } from "@/components/scope/use-optimistic-suggestions";
import { VirtualList } from "@/components/ui/virtual-list";
import { fetchAiReviewItemsForProjectAction } from "@/src/lib/ai-review/actions";
import { matchesConfidenceFilter } from "@/src/lib/ai-review/constants";
import { getDocumentPreviewKind } from "@/src/lib/documents/preview";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type {
  AiReviewItem,
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type ScopeWorkspaceProps = {
  projectId: string;
  aiReviewItems: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  pricingItems: PricingItem[];
};

type ScopeReviewViewProps = ScopeWorkspaceProps;

type UndoState = {
  itemId: string;
  previousStatus: AiReviewItem["status"];
  timeoutId: ReturnType<typeof setTimeout>;
};

export function ScopeReviewView({
  projectId,
  aiReviewItems: initialItems,
  documents,
  documentPages,
  takeoffItems,
}: ScopeReviewViewProps) {
  const { items, acceptItem, rejectItem, revertReject, acceptBulk, setItems } =
    useOptimisticSuggestions(initialItems);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState<string | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<
    "high" | "medium" | "low" | null
  >(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [adjustItem, setAdjustItem] = useState<AiReviewItem | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoStateRef = useRef<UndoState | null>(null);

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const drawingDocuments = useMemo(
    () =>
      documents.filter((doc) => {
        const kind = getDocumentPreviewKind(doc.file_type);
        return kind === "pdf" || kind === "image";
      }),
    [documents]
  );

  const defaultDocumentId = drawingDocuments[0]?.id ?? null;
  const [viewerDocumentId, setViewerDocumentId] = useState<string | null>(
    defaultDocumentId
  );
  const [viewerPage, setViewerPage] = useState<number | null>(null);

  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  const selectedItem = selectedItemId
    ? itemsById.get(selectedItemId) ?? null
    : null;

  const pendingSuggestions = useMemo(
    () => items.filter((item) => isPendingReviewStatus(item.status)),
    [items]
  );

  const visibleQueueItems = useMemo(() => {
    return pendingSuggestions.filter((item) => {
      if (tradeFilter && item.trade !== tradeFilter) {
        return false;
      }
      return matchesConfidenceFilter(item, confidenceFilter);
    });
  }, [pendingSuggestions, tradeFilter, confidenceFilter]);

  const pageAnnotations = useMemo(() => {
    if (viewerDocumentId == null || viewerPage == null) {
      return [];
    }
    return pendingSuggestions.filter(
      (item) =>
        item.source_document_id === viewerDocumentId &&
        item.page_number === viewerPage
    );
  }, [pendingSuggestions, viewerDocumentId, viewerPage]);

  useEffect(() => {
    undoStateRef.current = undoState;
  }, [undoState]);

  useEffect(() => {
    return () => {
      if (undoStateRef.current) {
        clearTimeout(undoStateRef.current.timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string; optimistic?: boolean }>)
        .detail;
      if (detail?.projectId && detail.projectId !== projectId) {
        return;
      }
      if (detail?.optimistic) {
        return;
      }
      void fetchAiReviewItemsForProjectAction(projectId).then((response) => {
        if (!response.error) {
          setItems(response.items);
        }
      });
    };

    window.addEventListener("quanta:ai-review-updated", handleUpdated);
    return () => {
      window.removeEventListener("quanta:ai-review-updated", handleUpdated);
    };
  }, [projectId, setItems]);

  const clearUndo = useCallback(() => {
    setUndoState((current) => {
      if (current) {
        clearTimeout(current.timeoutId);
      }
      return null;
    });
  }, []);

  const navigateViewerToItem = useCallback((item: AiReviewItem) => {
    if (item.source_document_id) {
      setViewerDocumentId((prev) =>
        prev === item.source_document_id ? prev : item.source_document_id
      );
    }
    if (item.page_number != null) {
      setViewerPage((prev) => (prev === item.page_number ? prev : item.page_number));
    }
  }, []);

  const handleSelectItem = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      const item = itemsById.get(itemId);
      if (item) {
        navigateViewerToItem(item);
      }
    },
    [itemsById, navigateViewerToItem]
  );

  const handleAccept = useCallback(
    async (itemId: string) => {
      setActionToast(null);
      clearUndo();
      setActionPendingId(itemId);
      setSelectedItemId((current) =>
        selectNextPendingId(visibleQueueItems, current, itemId)
      );

      const result = await acceptItem(itemId, projectId);
      setActionPendingId(null);

      if (result.error) {
        setActionToast(result.error);
        setSelectedItemId(itemId);
      }
    },
    [acceptItem, projectId, visibleQueueItems, clearUndo]
  );

  const handleReject = useCallback(
    async (itemId: string) => {
      const previous = itemsById.get(itemId);
      if (!previous) {
        return;
      }

      setActionToast(null);
      clearUndo();
      setActionPendingId(itemId);
      setSelectedItemId((current) =>
        selectNextPendingId(visibleQueueItems, current, itemId)
      );

      const result = await rejectItem(itemId, projectId);
      setActionPendingId(null);

      if (result.error) {
        setActionToast(result.error);
        setSelectedItemId(itemId);
        return;
      }

      const timeoutId = setTimeout(() => {
        setUndoState(null);
      }, 5000);

      setUndoState({
        itemId,
        previousStatus: previous.status,
        timeoutId,
      });
    },
    [itemsById, rejectItem, projectId, visibleQueueItems, clearUndo]
  );

  const handleUndoReject = useCallback(() => {
    if (!undoState) {
      return;
    }
    clearTimeout(undoState.timeoutId);
    revertReject(undoState.itemId, undoState.previousStatus);
    setUndoState(null);
    setSelectedItemId(undoState.itemId);
  }, [undoState, revertReject]);

  const drawingReferenceLabel = selectedItem?.drawing_reference ?? null;

  const sourceName = selectedItem?.source_document_id
    ? drawingContext.documentNames.get(selectedItem.source_document_id) ?? "Document"
    : "—";

  if (documents.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <p className="text-sm font-medium">Upload documents to start scope review</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Add PDF or image drawings under Documents, then run analysis to generate
          suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background">
      <ScopeToolbar
        items={pendingSuggestions}
        tradeFilter={tradeFilter}
        onTradeFilterChange={setTradeFilter}
        onApproveHigh={(ids) => acceptBulk(ids, projectId)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex h-full min-h-0 min-w-0 flex-[0.73] flex-col overflow-hidden">
          <ScopeDrawingPanel
            projectId={projectId}
            documents={documents}
            documentPages={documentPages}
            viewerDocumentId={viewerDocumentId}
            viewerPage={viewerPage}
            drawingReferenceLabel={drawingReferenceLabel}
            pageAnnotations={pageAnnotations}
            selectedItemId={selectedItemId}
            tradeFilter={tradeFilter}
            confidenceFilter={confidenceFilter}
            onSelectItem={handleSelectItem}
          />
          {selectedItem ? (
            <ScopeAnnotationCallout
              item={selectedItem}
              sourceName={sourceName}
              actionPending={actionPendingId === selectedItem.id}
              onAccept={() => void handleAccept(selectedItem.id)}
              onReject={() => void handleReject(selectedItem.id)}
              onAdjust={() => setAdjustItem(selectedItem)}
              onClose={() => setSelectedItemId(null)}
            />
          ) : null}
        </div>

        <aside className="flex h-full min-h-0 min-w-0 flex-[0.27] flex-col overflow-hidden border-l border-border bg-card">
          <ScopeSuggestionsQueueHeader
            pendingCount={pendingSuggestions.length}
            confidenceFilter={confidenceFilter}
            onConfidenceFilterChange={setConfidenceFilter}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2">
            {pendingSuggestions.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
                <p className="text-sm font-medium">No pending suggestions</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  All suggestions on this project have been reviewed.
                </p>
              </div>
            ) : visibleQueueItems.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
                No items match the current filters.
              </div>
            ) : (
              <VirtualList
                items={visibleQueueItems}
                estimateSize={88}
                className="min-h-0 flex-1 overflow-y-auto"
                getItemKey={(item) => item.id}
                renderItem={(item) => (
                  <div className="pb-1.5">
                    <ScopeSuggestionRow
                      item={item}
                      selected={item.id === selectedItemId}
                      actionPending={actionPendingId === item.id}
                      onSelect={handleSelectItem}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  </div>
                )}
              />
            )}
          </div>
          <p className="shrink-0 px-1 pt-1 text-[10px] text-muted-foreground">
            Review before adding to takeoff.
          </p>
        </aside>
      </div>

      <ImportToast
        message={actionToast}
        variant="error"
        onDismiss={() => setActionToast(null)}
      />

      <ScopeStatusBar
        items={items}
        takeoffCount={takeoffItems.length}
        undoLabel={undoState ? "Rejected." : null}
        onUndo={undoState ? handleUndoReject : undefined}
      />

      <AiReviewAdjustDialog
        item={adjustItem}
        open={adjustItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustItem(null);
          }
        }}
        projectId={projectId}
        onSuccess={() => {
          setAdjustItem(null);
          void fetchAiReviewItemsForProjectAction(projectId).then((response) => {
            if (!response.error) {
              setItems(response.items);
            }
          });
          window.dispatchEvent(
            new CustomEvent("quanta:ai-review-updated", {
              detail: { projectId },
            })
          );
        }}
      />
    </div>
  );
}
