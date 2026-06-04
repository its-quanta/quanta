"use client";

import { memo, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDocumentPreviewKind } from "@/src/lib/documents/preview";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type ScopeDocumentNavigatorProps = {
  documents: Document[];
  documentPages: DocumentPage[];
  activeDocumentId: string | null;
  activePage: number | null;
  pendingSuggestions: AiReviewItem[];
  onSelectDocument: (documentId: string) => void;
  onSelectPage: (pageNumber: number) => void;
};

export const ScopeDocumentNavigator = memo(function ScopeDocumentNavigator({
  documents,
  documentPages,
  activeDocumentId,
  activePage,
  pendingSuggestions,
  onSelectDocument,
  onSelectPage,
}: ScopeDocumentNavigatorProps) {
  const drawingDocuments = useMemo(
    () =>
      documents.filter((doc) => {
        const kind = getDocumentPreviewKind(doc.file_type);
        return kind === "pdf" || kind === "image";
      }),
    [documents]
  );

  const pagesByDocumentId = useMemo(() => {
    const map = new Map<string, DocumentPage[]>();
    for (const page of documentPages) {
      const list = map.get(page.document_id) ?? [];
      list.push(page);
      map.set(page.document_id, list);
    }
    for (const [docId, list] of map) {
      list.sort((a, b) => a.page_number - b.page_number);
      map.set(docId, list);
    }
    return map;
  }, [documentPages]);

  const pagesForActive = useMemo(() => {
    if (!activeDocumentId) {
      return [];
    }
    return pagesByDocumentId.get(activeDocumentId) ?? [];
  }, [activeDocumentId, pagesByDocumentId]);

  const pendingByDocPage = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of pendingSuggestions) {
      if (!item.source_document_id || item.page_number == null) {
        continue;
      }
      const key = `${item.source_document_id}:${item.page_number}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [pendingSuggestions]);

  return (
    <aside className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Documents</h3>
        <p className="text-[11px] text-muted-foreground">
          {drawingDocuments.length} drawing{drawingDocuments.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ul className="flex flex-col gap-0.5 p-2">
          {drawingDocuments.map((doc) => {
            const isDocActive = doc.id === activeDocumentId;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelectDocument(doc.id)}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                    isDocActive
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/50"
                  )}
                >
                  <p className="truncate text-xs font-medium">{doc.file_name}</p>
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {doc.page_count ??
                      (pagesByDocumentId.get(doc.id)?.length ?? 0)}{" "}
                    pp
                  </p>
                </button>

                {isDocActive && pagesForActive.length > 0 ? (
                  <ul className="mb-1 ml-2 border-l border-border pl-2">
                    {pagesForActive.map((page) => {
                      const pendingCount =
                        pendingByDocPage.get(`${doc.id}:${page.page_number}`) ?? 0;
                      const isPageActive = activePage === page.page_number;
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            onClick={() => onSelectPage(page.page_number)}
                            className={cn(
                              "flex w-full items-center justify-between gap-1 rounded px-1.5 py-1 text-left text-[11px]",
                              isPageActive
                                ? "bg-sky-500/10 font-medium text-sky-900 dark:text-sky-200"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            )}
                          >
                            <span className="font-mono tabular-nums">
                              p.{page.page_number}
                              {page.sheet_number ? ` · ${page.sheet_number}` : ""}
                            </span>
                            {pendingCount > 0 ? (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[9px] tabular-nums"
                              >
                                {pendingCount}
                              </Badge>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
});
