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
import { ScopeContextPanel } from "@/components/scope/scope-context-panel";
import { ScopeDocumentNavigator } from "@/components/scope/scope-document-navigator";
import { ScopeDrawingPanel } from "@/components/scope/scope-drawing-panel";
import { ScopeFullscreenReview } from "@/components/scope/scope-fullscreen-review";
import {
  resolveSuggestionDrawingRef,
  resolveTakeoffDrawingRef,
} from "@/components/scope/scope-drawing-references";
import {
  SCOPE_CONTEXT_COLUMN_CLASS,
  SCOPE_DRAWING_COLUMN_CLASS,
  SCOPE_NAVIGATOR_COLUMN_CLASS,
  SCOPE_WORKSPACE_BODY_CLASS,
} from "@/components/scope/scope-layout";
import type { ScopePanelMode } from "@/components/scope/scope-panel-mode";
import {
  isPendingReviewStatus,
  selectNextPendingId,
} from "@/components/scope/scope-review-utils";
import { resolveScopeTakeoffReadiness } from "@/components/scope/scope-takeoff-readiness";
import { ScopeStatusBar } from "@/components/scope/scope-status-bar";
import { ScopeSuggestionsQueue } from "@/components/scope/scope-suggestions-queue";
import { ScopeTakeoffQueue } from "@/components/scope/scope-takeoff-queue";
import { useOptimisticSuggestions } from "@/components/scope/use-optimistic-suggestions";
import { useScopeTakeoffItems } from "@/components/scope/use-scope-takeoff-items";
import {
  getViewerNavigationFromItem,
  normalizeViewerPage,
} from "@/components/scope/scope-viewer-navigation";
import { fetchAiReviewItemsForProjectAction } from "@/src/lib/ai-review/actions";
import { matchesConfidenceFilter } from "@/src/lib/ai-review/constants";
import { getDocumentPreviewKind } from "@/src/lib/documents/preview";
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
  projectName: string;
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
  projectName,
  aiReviewItems: initialItems,
  documents,
  documentPages,
  takeoffItems: initialTakeoffItems,
  takeoffAssemblies,
  pricingItems,
}: ScopeReviewViewProps) {
  const { items, acceptItem, rejectItem, revertReject, acceptBulk, setItems } =
    useOptimisticSuggestions(initialItems);
  const {
    items: scopeTakeoffItems,
    refresh: refreshTakeoffItems,
    patchItem: patchTakeoffItem,
  } = useScopeTakeoffItems(initialTakeoffItems, projectId);

  const [panelMode, setPanelMode] = useState<ScopePanelMode>("suggestions");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTakeoffId, setSelectedTakeoffId] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState<string | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<
    "high" | "medium" | "low" | null
  >(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [adjustItem, setAdjustItem] = useState<AiReviewItem | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const undoStateRef = useRef<UndoState | null>(null);

  const documentsById = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc] as const)),
    [documents]
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
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    defaultDocumentId
  );
  const [activePage, setActivePage] = useState<number | null>(null);

  const viewerPage = normalizeViewerPage(activePage);

  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  const selectedItem = selectedItemId
    ? itemsById.get(selectedItemId) ?? null
    : null;

  const takeoffItemsById = useMemo(
    () => new Map(scopeTakeoffItems.map((item) => [item.id, item])),
    [scopeTakeoffItems]
  );

  const selectedTakeoff = selectedTakeoffId
    ? takeoffItemsById.get(selectedTakeoffId) ?? null
    : null;

  const activeTakeoffLines = useMemo(
    () => scopeTakeoffItems.filter((item) => item.status !== "excluded"),
    [scopeTakeoffItems]
  );

  const pendingSuggestions = useMemo(
    () => items.filter((item) => isPendingReviewStatus(item.status)),
    [items]
  );

  const visibleQueueItems = useMemo(
    () =>
      pendingSuggestions.filter((item) => {
        if (tradeFilter && item.trade !== tradeFilter) {
          return false;
        }
        return matchesConfidenceFilter(item, confidenceFilter);
      }),
    [pendingSuggestions, tradeFilter, confidenceFilter]
  );

  const visibleTakeoffItems = useMemo(
    () =>
      activeTakeoffLines.filter((item) => {
        if (tradeFilter && item.trade !== tradeFilter) {
          return false;
        }
        return true;
      }),
    [activeTakeoffLines, tradeFilter]
  );

  const tradeOptions = useMemo(() => {
    const set = new Set<string>();
    const source =
      panelMode === "suggestions" ? pendingSuggestions : activeTakeoffLines;
    for (const item of source) {
      if (item.trade.trim()) {
        set.add(item.trade);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [panelMode, pendingSuggestions, activeTakeoffLines]);

  const pagesForActiveDocument = useMemo(() => {
    if (!activeDocumentId) {
      return [];
    }
    return documentPages
      .filter((page) => page.document_id === activeDocumentId)
      .sort((a, b) => a.page_number - b.page_number);
  }, [activeDocumentId, documentPages]);

  const pageSuggestions = useMemo(() => {
    if (activeDocumentId == null || viewerPage == null) {
      return [];
    }
    return pendingSuggestions.filter(
      (item) =>
        item.source_document_id === activeDocumentId &&
        normalizeViewerPage(item.page_number) === viewerPage
    );
  }, [pendingSuggestions, activeDocumentId, viewerPage]);

  const pageTakeoffItems = useMemo(() => {
    if (activeDocumentId == null || viewerPage == null) {
      return [];
    }
    return activeTakeoffLines.filter(
      (item) =>
        item.source_document_id === activeDocumentId &&
        normalizeViewerPage(item.page_number) === viewerPage
    );
  }, [activeTakeoffLines, activeDocumentId, viewerPage]);

  const assemblyByTakeoffId = useMemo(
    () =>
      new Map(
        takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [takeoffAssemblies]
  );

  const pricingByTakeoffId = useMemo(
    () =>
      new Map(pricingItems.map((row) => [row.takeoff_item_id, row] as const)),
    [pricingItems]
  );

  const selectedTakeoffAssembly = selectedTakeoff
    ? assemblyByTakeoffId.get(selectedTakeoff.id) ?? null
    : null;

  const selectedTakeoffReadiness = selectedTakeoff
    ? resolveScopeTakeoffReadiness(
        selectedTakeoff.id,
        assemblyByTakeoffId,
        pricingByTakeoffId
      )
    : null;

  const viewerSourceBadge = useMemo(() => {
    const documentName = activeDocumentId
      ? documentsById.get(activeDocumentId)?.file_name ?? "Document"
      : "No document selected";

    const focusSuggestion = panelMode === "suggestions" ? selectedItem : null;
    const focusTakeoff = panelMode === "takeoff" ? selectedTakeoff : null;

    const ref = focusSuggestion
      ? resolveSuggestionDrawingRef(focusSuggestion, documentsById)
      : focusTakeoff
        ? resolveTakeoffDrawingRef(focusTakeoff, documentsById)
        : null;

    return {
      documentName,
      pageNumber: viewerPage,
      totalPages: pagesForActiveDocument.length || null,
      drawingNumber: ref?.drawing_number ?? null,
      drawingName: ref?.drawing_name ?? null,
    };
  }, [
    activeDocumentId,
    viewerPage,
    documentsById,
    pagesForActiveDocument.length,
    selectedItem,
    selectedTakeoff,
    panelMode,
  ]);

  useEffect(() => {
    if (viewerPage != null || pendingSuggestions.length === 0) {
      return;
    }
    const firstWithPage = pendingSuggestions.find((item) => {
      const { documentId, page } = getViewerNavigationFromItem(item);
      return documentId != null && page != null;
    });
    if (firstWithPage) {
      const { documentId, page } = getViewerNavigationFromItem(firstWithPage);
      if (documentId) {
        setActiveDocumentId(documentId);
      }
      if (page != null) {
        setActivePage(page);
      }
    }
  }, [viewerPage, pendingSuggestions]);

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

  const navigateViewerToLinkedItem = useCallback(
    (item: { source_document_id: string | null; page_number: number | null }) => {
      const { documentId, page } = getViewerNavigationFromItem(item);
      if (documentId) {
        setActiveDocumentId(documentId);
      }
      if (page != null) {
        setActivePage(page);
      }
    },
    []
  );

  const handleSelectDocument = useCallback((documentId: string) => {
    setActiveDocumentId(documentId);
    const pages = documentPages
      .filter((page) => page.document_id === documentId)
      .sort((a, b) => a.page_number - b.page_number);
    const firstPage = normalizeViewerPage(pages[0]?.page_number) ?? 1;
    setActivePage(firstPage);
  }, [documentPages]);

  const handleSelectPage = useCallback((pageNumber: number) => {
    const page = normalizeViewerPage(pageNumber);
    if (page != null) {
      setActivePage(page);
    }
  }, []);

  const handleSelectItem = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      setSelectedTakeoffId(null);
      const item = itemsById.get(itemId);
      if (item) {
        navigateViewerToLinkedItem(item);
      }
    },
    [itemsById, navigateViewerToLinkedItem]
  );

  const handleSelectTakeoffItem = useCallback(
    (itemId: string) => {
      setSelectedTakeoffId(itemId);
      setSelectedItemId(null);
      const item = takeoffItemsById.get(itemId);
      if (item) {
        navigateViewerToLinkedItem(item);
      }
    },
    [takeoffItemsById, navigateViewerToLinkedItem]
  );

  const handleAdjustById = useCallback(
    (itemId: string) => {
      const item = itemsById.get(itemId);
      if (item) {
        setAdjustItem(item);
      }
    },
    [itemsById]
  );

  const handleAccept = useCallback(
    async (itemId: string) => {
      setActionToast(null);
      clearUndo();
      setActionPendingId(itemId);
      const nextId = selectNextPendingId(
        visibleQueueItems,
        selectedItemId,
        itemId
      );
      setSelectedItemId(nextId);
      setSelectedTakeoffId(null);
      if (nextId) {
        const next = itemsById.get(nextId);
        if (next) {
          navigateViewerToLinkedItem(next);
        }
      }

      const result = await acceptItem(itemId, projectId);
      setActionPendingId(null);

      if (result.error) {
        setActionToast(result.error);
        setSelectedItemId(itemId);
      } else {
        void refreshTakeoffItems();
      }
    },
    [
      acceptItem,
      projectId,
      visibleQueueItems,
      selectedItemId,
      itemsById,
      navigateViewerToLinkedItem,
      clearUndo,
      refreshTakeoffItems,
    ]
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
      const nextId = selectNextPendingId(
        visibleQueueItems,
        selectedItemId,
        itemId
      );
      setSelectedItemId(nextId);
      setSelectedTakeoffId(null);
      if (nextId) {
        const next = itemsById.get(nextId);
        if (next) {
          navigateViewerToLinkedItem(next);
        }
      }

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
    [
      itemsById,
      rejectItem,
      projectId,
      visibleQueueItems,
      selectedItemId,
      navigateViewerToLinkedItem,
      clearUndo,
    ]
  );

  const selectNextInQueue = useCallback(() => {
    if (visibleQueueItems.length === 0) {
      return;
    }
    const currentIndex = selectedItemId
      ? visibleQueueItems.findIndex((item) => item.id === selectedItemId)
      : -1;
    const nextIndex = (currentIndex + 1) % visibleQueueItems.length;
    const next = visibleQueueItems[nextIndex];
    if (next) {
      handleSelectItem(next.id);
    }
  }, [visibleQueueItems, selectedItemId, handleSelectItem]);

  useEffect(() => {
    if (!fullscreenOpen) {
      return;
    }

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "a" || event.key === "A") {
        if (selectedItemId) {
          event.preventDefault();
          void handleAccept(selectedItemId);
        }
        return;
      }

      if (event.key === "r" || event.key === "R") {
        if (selectedItemId) {
          event.preventDefault();
          void handleReject(selectedItemId);
        }
        return;
      }

      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        selectNextInQueue();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    fullscreenOpen,
    selectedItemId,
    handleAccept,
    handleReject,
    selectNextInQueue,
  ]);

  const handleUndoReject = useCallback(() => {
    if (!undoState) {
      return;
    }
    clearTimeout(undoState.timeoutId);
    revertReject(undoState.itemId, undoState.previousStatus);
    setUndoState(null);
    setSelectedItemId(undoState.itemId);
    setSelectedTakeoffId(null);
  }, [undoState, revertReject]);

  const drawingPanelProps = useMemo(
    () => ({
      projectId,
      documents,
      activeDocumentId,
      activePage,
      panelMode,
      sourceBadge: viewerSourceBadge,
      pageSuggestions,
      pageTakeoffItems,
      selectedSuggestionId: selectedItemId,
      selectedTakeoffId,
      tradeFilter,
      confidenceFilter,
      onSelectSuggestion: handleSelectItem,
      onSelectTakeoff: handleSelectTakeoffItem,
      renderPdf: !fullscreenOpen,
      onOpenFullscreen: () => setFullscreenOpen(true),
      showFullscreenButton: true,
    }),
    [
      projectId,
      documents,
      activeDocumentId,
      activePage,
      fullscreenOpen,
      panelMode,
      viewerSourceBadge,
      pageSuggestions,
      pageTakeoffItems,
      selectedItemId,
      selectedTakeoffId,
      tradeFilter,
      confidenceFilter,
      handleSelectItem,
      handleSelectTakeoffItem,
    ]
  );

  const suggestionsList = useMemo(
    () => (
      <ScopeSuggestionsQueue
        pendingCount={pendingSuggestions.length}
        visibleQueueItems={visibleQueueItems}
        documentsById={documentsById}
        confidenceFilter={confidenceFilter}
        onConfidenceFilterChange={setConfidenceFilter}
        selectedItemId={selectedItemId}
        actionPendingId={actionPendingId}
        onSelectItem={handleSelectItem}
        onAccept={(id) => void handleAccept(id)}
        onAdjust={handleAdjustById}
        onReject={(id) => void handleReject(id)}
      />
    ),
    [
      pendingSuggestions.length,
      visibleQueueItems,
      documentsById,
      confidenceFilter,
      selectedItemId,
      actionPendingId,
      handleSelectItem,
      handleAccept,
      handleAdjustById,
      handleReject,
    ]
  );

  const takeoffList = useMemo(
    () => (
      <ScopeTakeoffQueue
        items={activeTakeoffLines}
        visibleItems={visibleTakeoffItems}
        selectedItemId={selectedTakeoffId}
        documentsById={documentsById}
        takeoffAssemblies={takeoffAssemblies}
        pricingItems={pricingItems}
        onSelectItem={handleSelectTakeoffItem}
      />
    ),
    [
      activeTakeoffLines,
      visibleTakeoffItems,
      selectedTakeoffId,
      documentsById,
      takeoffAssemblies,
      pricingItems,
      handleSelectTakeoffItem,
    ]
  );

  const contextPanel = useMemo(
    () => (
      <ScopeContextPanel
        panelMode={panelMode}
        onPanelModeChange={setPanelMode}
        pendingSuggestionCount={pendingSuggestions.length}
        takeoffLineCount={activeTakeoffLines.length}
        items={items}
        tradeOptions={tradeOptions}
        tradeFilter={tradeFilter}
        onTradeFilterChange={setTradeFilter}
        onApproveHigh={async (ids) => {
          const result = await acceptBulk(ids, projectId);
          if (!result.error) {
            void refreshTakeoffItems();
          }
          return result;
        }}
        list={panelMode === "suggestions" ? suggestionsList : takeoffList}
        projectId={projectId}
        documentsById={documentsById}
        selectedSuggestion={selectedItem}
        selectedTakeoff={selectedTakeoff}
        takeoffAssembly={selectedTakeoffAssembly}
        takeoffReadiness={selectedTakeoffReadiness}
        actionPending={actionPendingId === selectedItem?.id}
        onAccept={() => {
          if (selectedItem) {
            void handleAccept(selectedItem.id);
          }
        }}
        onAdjust={() => {
          if (selectedItem) {
            setAdjustItem(selectedItem);
          }
        }}
        onReject={() => {
          if (selectedItem) {
            void handleReject(selectedItem.id);
          }
        }}
        onTakeoffUpdated={patchTakeoffItem}
      />
    ),
    [
      panelMode,
      pendingSuggestions.length,
      activeTakeoffLines.length,
      items,
      tradeOptions,
      tradeFilter,
      acceptBulk,
      projectId,
      refreshTakeoffItems,
      suggestionsList,
      takeoffList,
      documentsById,
      selectedItem,
      selectedTakeoff,
      selectedTakeoffAssembly,
      selectedTakeoffReadiness,
      actionPendingId,
      handleAccept,
      handleReject,
      patchTakeoffItem,
    ]
  );

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
    <>
      <div className="flex flex-col gap-0">
        <div className={SCOPE_WORKSPACE_BODY_CLASS}>
          <div className={SCOPE_NAVIGATOR_COLUMN_CLASS}>
            <ScopeDocumentNavigator
              documents={documents}
              documentPages={documentPages}
              activeDocumentId={activeDocumentId}
              activePage={activePage}
              pendingSuggestions={pendingSuggestions}
              onSelectDocument={handleSelectDocument}
              onSelectPage={handleSelectPage}
            />
          </div>

          <div className={SCOPE_DRAWING_COLUMN_CLASS}>
            <ScopeDrawingPanel {...drawingPanelProps} />
          </div>

          <div className={SCOPE_CONTEXT_COLUMN_CLASS}>{contextPanel}</div>
        </div>

        <ImportToast
          message={actionToast}
          variant="error"
          onDismiss={() => setActionToast(null)}
        />

        <ScopeStatusBar
          items={items}
          takeoffCount={activeTakeoffLines.length}
          panelMode={panelMode}
          undoLabel={undoState ? "Rejected." : null}
          onUndo={undoState ? handleUndoReject : undefined}
        />
      </div>

      <ScopeFullscreenReview
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        projectName={projectName}
        sourceBadge={viewerSourceBadge}
        drawingPanel={
          <ScopeDrawingPanel
            {...drawingPanelProps}
            renderPdf
            showFullscreenButton={false}
          />
        }
        contextPanel={contextPanel}
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
    </>
  );
}
