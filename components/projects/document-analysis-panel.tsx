"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DocumentAnalysisProgressCard } from "@/components/projects/document-analysis-progress-card";
import { useSimulatedAnalysisProgress } from "@/components/projects/use-simulated-analysis-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LARGE_PDF_FULL_FILE_WARNING,
  MAX_ANALYSIS_BATCH_PAGES,
} from "@/src/lib/ai-review/document-analysis/constants";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import {
  formatBytes,
  parsePageRanges,
  TOO_MANY_PAGES_MESSAGE,
} from "@/src/lib/ai-review/document-analysis/page-selection";
import {
  analyseProjectDocumentsBatchAction,
  getDocumentAnalysisMetadataAction,
  listDocumentsForAnalysisAction,
  type DocumentAnalysisCatalogItem,
  type DocumentAnalysisMetadata,
} from "@/src/lib/ai-review/document-analysis/actions";
import { resolveSelectedPagesForAnalysis } from "@/src/lib/ai-review/document-analysis/resolve-selected-pages";
import type { AiReviewTradeFocus } from "@/src/lib/ai-review/document-analysis/types";
import type {
  Document,
  DocumentClassification,
  DocumentPage,
} from "@/src/types/database";

const DOCUMENT_TYPE_LABELS: Record<DocumentClassification, string> = {
  architectural_drawings: "Architectural drawings",
  structural_drawings: "Structural drawings",
  specification: "Specification",
  schedule: "Schedule",
  scope_document: "Scope document",
  photos_images: "Photos / images",
  other: "Other",
};

type DocumentAnalysisPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
};

type PageSelectionMode = "range" | "first_10" | "custom" | "selected_only";

export function DocumentAnalysisPanel({
  projectId,
  documents: _documents,
  documentPages,
}: DocumentAnalysisPanelProps) {
  const router = useRouter();
  const [isCatalogPending, startCatalogTransition] = useTransition();
  const [isMetadataPending, startMetadataTransition] = useTransition();
  const progress = useSimulatedAnalysisProgress();

  const [catalog, setCatalog] = useState<DocumentAnalysisCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tradeFocus, setTradeFocus] = useState<AiReviewTradeFocus>("General");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [metadata, setMetadata] = useState<DocumentAnalysisMetadata | null>(
    null
  );
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [pageRangeInput, setPageRangeInput] = useState("");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState<PageSelectionMode>("range");
  const [formError, setFormError] = useState<string | null>(null);

  const loadCatalog = useCallback(() => {
    startCatalogTransition(async () => {
      const result = await listDocumentsForAnalysisAction(projectId);
      if (result.error) {
        setCatalogError(result.error);
        return;
      }
      setCatalog(result.documents ?? []);
      setCatalogError(null);
    });
  }, [projectId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const pdfAndImageCatalog = useMemo(
    () => catalog.filter((item) => item.isSupported),
    [catalog]
  );

  const selectedCatalogItem = pdfAndImageCatalog.find(
    (item) => item.id === selectedDocumentId
  );

  const pagesForDocument = useMemo(
    () =>
      documentPages.filter((row) => row.document_id === selectedDocumentId),
    [documentPages, selectedDocumentId]
  );

  const isPdfSelected = selectedCatalogItem?.isPdf ?? false;
  const showPageTools = Boolean(selectedDocumentId && isPdfSelected);

  const resolvePagesForRun = useCallback((): {
    pages: number[];
    error?: string;
  } => {
    if (!isPdfSelected) {
      return { pages: [1] };
    }

    return resolveSelectedPagesForAnalysis({
      body: {
        selectedPages,
        pageRangeInput: pageRangeInput.trim() || undefined,
        preset: selectionMode === "first_10" ? "first_10" : undefined,
      },
      isPdf: true,
      pageCount: metadata?.pageCount ?? null,
      pageCountKnown: metadata?.pageCountKnown ?? false,
      documentPages: pagesForDocument,
      documentId: selectedDocumentId,
    });
  }, [
    isPdfSelected,
    selectedPages,
    pageRangeInput,
    selectionMode,
    metadata?.pageCount,
    metadata?.pageCountKnown,
    pagesForDocument,
    selectedDocumentId,
  ]);

  const effectiveSelectedPages = useMemo(() => {
    const resolved = resolvePagesForRun();
    return resolved.pages;
  }, [resolvePagesForRun]);

  const estimatedBytes = useMemo(() => {
    if (!metadata?.sizeBytes) {
      return 0;
    }
    if (!isPdfSelected) {
      return metadata.sizeBytes;
    }
    const totalPages =
      metadata.pageCountKnown && metadata.pageCount ? metadata.pageCount : null;
    if (!totalPages || totalPages <= 0) {
      return 0;
    }
    const count = selectedPages.length || 1;
    const ratio = Math.min(1, count / totalPages);
    return Math.ceil(metadata.sizeBytes * ratio * 1.15);
  }, [metadata, selectedPages.length, isPdfSelected]);

  const loadMetadata = useCallback(
    (documentId: string) => {
      setMetadataError(null);
      setMetadata(null);
      setSelectedPages([]);
      setPageRangeInput("");
      setFormError(null);

      if (!documentId) {
        return;
      }

      startMetadataTransition(async () => {
        const result = await getDocumentAnalysisMetadataAction(
          projectId,
          documentId
        );

        if (result.metadata) {
          setMetadata(result.metadata);
          if (
            !result.metadata.isTooLargeForFullAnalysis &&
            result.metadata.pageCountKnown &&
            result.metadata.pageCount != null &&
            result.metadata.pageCount <= MAX_ANALYSIS_BATCH_PAGES
          ) {
            setSelectedPages(
              Array.from(
                { length: result.metadata.pageCount },
                (_, index) => index + 1
              )
            );
          }
        }

        if (result.error && !result.metadata) {
          setMetadataError(result.error);
        } else if (result.error) {
          setMetadataError(result.error);
        }
      });
    },
    [projectId]
  );

  function selectDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    loadMetadata(documentId);
  }

  function togglePage(pageNumber: number) {
    setSelectionMode("custom");
    setSelectedPages((current) => {
      if (current.includes(pageNumber)) {
        return current.filter((n) => n !== pageNumber);
      }
      if (current.length >= MAX_ANALYSIS_BATCH_PAGES) {
        setFormError(TOO_MANY_PAGES_MESSAGE);
        return current;
      }
      setFormError(null);
      return [...current, pageNumber].sort((a, b) => a - b);
    });
  }

  function applyFirst10() {
    if (!metadata?.pageCountKnown || !metadata.pageCount) {
      setFormError("Enter a page range — total page count is not loaded yet.");
      return;
    }
    setSelectionMode("first_10");
    setFormError(null);
    const end = Math.min(metadata.pageCount, MAX_ANALYSIS_BATCH_PAGES);
    setSelectedPages(Array.from({ length: end }, (_, i) => i + 1));
    setPageRangeInput(
      end === 1 ? "1" : `1-${end}`
    );
  }

  function applyPageRange() {
    setSelectionMode("range");
    const maxPage =
      metadata?.pageCountKnown && metadata.pageCount
        ? metadata.pageCount
        : undefined;
    const parsed = parsePageRanges(pageRangeInput, {
      maxPage,
      maxSelected: MAX_ANALYSIS_BATCH_PAGES,
    });
    if (parsed.error) {
      setFormError(parsed.error);
      return;
    }
    setFormError(null);
    setSelectedPages(parsed.pages);
  }

  function validateBeforeRun(): string | null {
    if (!selectedDocumentId) {
      return ANALYSIS_ERRORS.noDocumentSelected;
    }
    if (!selectedCatalogItem?.hasStoragePath) {
      return ANALYSIS_ERRORS.storagePathMissing;
    }
    if (!selectedCatalogItem.isSupported) {
      return ANALYSIS_ERRORS.unsupportedFileType;
    }

    const resolved = resolvePagesForRun();
    if (resolved.error) {
      return resolved.error;
    }

    if (isPdfSelected) {
      if (resolved.pages.length === 0) {
        return metadata?.isTooLargeForFullAnalysis
          ? ANALYSIS_ERRORS.selectPagesForLargeFile
          : ANALYSIS_ERRORS.noPagesSelected;
      }
      if (resolved.pages.length > MAX_ANALYSIS_BATCH_PAGES) {
        return ANALYSIS_ERRORS.tooManyPages;
      }
    }

    return null;
  }

  async function runAnalysis() {
    const validationError = validateBeforeRun();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const resolved = resolvePagesForRun();
    const pagesToSend = resolved.pages;

    if (isPdfSelected && pagesToSend.length > 0) {
      setSelectedPages(pagesToSend);
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[document-analysis] run", {
        selectedDocumentId,
        pageRangeInput,
        parsedSelectedPages: pagesToSend,
        requestPayload: {
          projectId,
          documentId: selectedDocumentId,
          selectedPages: pagesToSend,
          tradeFocus,
        },
      });
    }

    setFormError(null);
    setMetadataError(null);

    await progress.run(async () =>
      analyseProjectDocumentsBatchAction(projectId, {
        tradeFocus,
        documentId: selectedDocumentId,
        selectedPages: pagesToSend,
        selected_pages: pagesToSend,
        pageRangeInput: pageRangeInput.trim() || undefined,
      })
    );

    router.refresh();
  }

  const showProgress = progress.runPhase !== "idle";
  const formDisabled = progress.isRunning || isMetadataPending;

  if (showProgress) {
    return (
      <DocumentAnalysisProgressCard
        projectId={projectId}
        stages={progress.stages}
        progressPercent={progress.progressPercent}
        runPhase={progress.runPhase as "running" | "complete" | "failed"}
        result={progress.result}
        errorMessage={progress.errorMessage}
        errorCode={progress.errorCode}
        onDismiss={progress.reset}
      />
    );
  }

  const checkboxPageCount =
    metadata?.pageCountKnown && metadata.pageCount
      ? metadata.pageCount
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        AI suggestions are drafts. Review every suggestion before accepting it
        into your live takeoff. Analyse up to {MAX_ANALYSIS_BATCH_PAGES} pages
        per batch (25 MB).
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="analysis-trade">Trade focus</Label>
        <Select
          value={tradeFocus}
          disabled={formDisabled}
          onValueChange={(value) => setTradeFocus(value as AiReviewTradeFocus)}
        >
          <SelectTrigger id="analysis-trade" className="max-w-sm">
            <SelectValue placeholder="Select trade focus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Carpentry">Carpentry</SelectItem>
            <SelectItem value="Partitions">Partitions</SelectItem>
            <SelectItem value="Ceilings">Ceilings</SelectItem>
            <SelectItem value="Demolition">Demolition</SelectItem>
            <SelectItem value="Flooring">Flooring</SelectItem>
            <SelectItem value="Joinery">Joinery</SelectItem>
            <SelectItem value="General">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Uploaded documents</h3>
          {isCatalogPending ? (
            <Badge variant="outline">Loading</Badge>
          ) : (
            <Badge variant="outline">{pdfAndImageCatalog.length} supported</Badge>
          )}
        </div>

        {catalogError ? (
          <p className="text-sm text-destructive" role="alert">
            {catalogError}
          </p>
        ) : null}

        <ul className="flex flex-col gap-2" aria-label="Documents for analysis">
          {pdfAndImageCatalog.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              No PDF or image documents uploaded yet.
            </li>
          ) : (
            pdfAndImageCatalog.map((item) => {
              const isSelected = item.id === selectedDocumentId;
              const typeLabel =
                DOCUMENT_TYPE_LABELS[
                  item.documentType as DocumentClassification
                ] ?? item.documentType;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={formDisabled}
                    onClick={() => selectDocument(item.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20"
                        : "border-border/80 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">{item.fileName}</p>
                      {isSelected && isMetadataPending ? (
                        <Badge variant="outline">Loading details</Badge>
                      ) : isSelected ? (
                        <Badge
                          variant="outline"
                          className="border-violet-500/40 text-violet-800"
                        >
                          Selected
                        </Badge>
                      ) : null}
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Type</dt>
                        <dd>{typeLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Format</dt>
                        <dd className="uppercase">
                          {item.isPdf ? "PDF" : item.mimeType.split("/")[1]}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Pages</dt>
                        <dd className="font-mono tabular-nums">
                          {item.pageCount ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Storage</dt>
                        <dd>
                          {item.hasStoragePath ? "Ready" : "Path missing"}
                        </dd>
                      </div>
                    </dl>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {catalog
          .filter((item) => !item.isSupported)
          .slice(0, 3)
          .map((item) => (
            <p key={item.id} className="text-xs text-muted-foreground">
              {item.fileName} — not supported for analysis (PDF, PNG, JPG only).
            </p>
          ))}
      </div>

      {metadataError ? (
        <p className="text-sm text-amber-900" role="status">
          {metadataError}
        </p>
      ) : null}

      {metadata?.guidance ? (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          {LARGE_PDF_FULL_FILE_WARNING}
        </p>
      ) : null}

      {metadata && selectedDocumentId ? (
        <dl className="grid gap-3 rounded-lg border border-border/80 bg-muted/10 p-3 sm:grid-cols-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">File size</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {metadata.sizeBytes != null
                ? formatBytes(metadata.sizeBytes)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pages</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {metadata.pageCountKnown && metadata.pageCount != null
                ? metadata.pageCount
                : "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Selected</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {selectedPages.length || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Est. batch</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {estimatedBytes > 0 ? formatBytes(estimatedBytes) : "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      {showPageTools ? (
        <div className="space-y-3 rounded-lg border border-border/80 p-3">
          <p className="text-sm font-medium">Page selection</p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectionMode === "first_10" ? "default" : "outline"}
              disabled={formDisabled}
              onClick={applyFirst10}
            >
              First {MAX_ANALYSIS_BATCH_PAGES} pages
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectionMode === "custom" ? "default" : "outline"}
              disabled={formDisabled}
              onClick={() => {
                setSelectionMode("custom");
                setFormError(null);
              }}
            >
              Custom pages
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                selectionMode === "selected_only" ? "default" : "outline"
              }
              disabled={formDisabled || selectedPages.length === 0}
              onClick={() => {
                setSelectionMode("selected_only");
                setFormError(null);
              }}
            >
              Analyse selected pages only
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1 space-y-1">
              <Label htmlFor="page-range">Page range</Label>
              <Input
                id="page-range"
                placeholder="e.g. 1-5, 8, 12-14"
                value={pageRangeInput}
                disabled={formDisabled}
                onChange={(event) => {
                  setPageRangeInput(event.target.value);
                  setSelectionMode("range");
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={formDisabled}
              onClick={applyPageRange}
            >
              Apply range
            </Button>
          </div>

          {selectionMode === "custom" && checkboxPageCount > 0 ? (
            <div className="max-h-48 overflow-y-auto rounded border border-border/60 p-2">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: checkboxPageCount }, (_, index) => {
                  const pageNumber = index + 1;
                  const checked = selectedPages.includes(pageNumber);
                  const row = pagesForDocument.find(
                    (p) => p.page_number === pageNumber
                  );
                  return (
                    <label
                      key={pageNumber}
                      className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border"
                        checked={checked}
                        disabled={formDisabled}
                        onChange={() => togglePage(pageNumber)}
                      />
                      <span className="font-mono tabular-nums">
                        {pageNumber}
                      </span>
                      {row?.page_type ? (
                        <span className="truncate text-muted-foreground">
                          {row.page_type}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : selectionMode === "custom" ? (
            <p className="text-xs text-muted-foreground">
              Page count is loading or unknown — use the range field above
              (e.g. 1-5, 8, 12-14).
            </p>
          ) : null}

          {effectiveSelectedPages.length > 0 ? (
            <p className="text-sm text-foreground">
              {effectiveSelectedPages.length === 1 ? (
                <>
                  Selected pages:{" "}
                  <span className="font-mono tabular-nums">
                    {effectiveSelectedPages[0]}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono tabular-nums">
                    {effectiveSelectedPages.length} pages selected
                  </span>
                  {": "}
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {effectiveSelectedPages.join(", ")}
                  </span>
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No pages selected yet. Enter a range or use a quick option above.
            </p>
          )}
        </div>
      ) : selectedCatalogItem && !isPdfSelected ? (
        <p className="text-sm text-muted-foreground">
          This image will be analysed as a single sheet.
        </p>
      ) : null}

      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={
            formDisabled ||
            pdfAndImageCatalog.length === 0 ||
            !selectedDocumentId
          }
          onClick={() => void runAnalysis()}
        >
          Run analysis
        </Button>
        {!selectedDocumentId ? (
          <span className="text-xs text-muted-foreground">
            Select a document to continue.
          </span>
        ) : null}
      </div>
    </div>
  );
}
