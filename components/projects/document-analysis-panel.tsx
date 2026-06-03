"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DocumentAnalysisStatusPanel } from "@/components/projects/document-analysis-status-panel";
import { useAnalysisRunPolling } from "@/components/projects/use-analysis-run-polling";
import { startDocumentAnalysisRunAction } from "@/src/lib/analysis-runs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  resolvePagePreset,
  TOO_MANY_PAGES_MESSAGE,
  type PageSelectionPreset,
} from "@/src/lib/ai-review/document-analysis/page-selection";
import {
  DRAWING_REGISTER_QUICK_FILTERS,
  DRAWING_REGISTER_TYPE_LABELS,
  matchesDrawingRegisterFilter,
  type DrawingRegisterQuickFilter,
} from "@/src/lib/documents/drawing-register/constants";
import {
  getDocumentAnalysisMetadataAction,
  listDocumentsForAnalysisAction,
  type DocumentAnalysisCatalogItem,
  type DocumentAnalysisMetadata,
} from "@/src/lib/ai-review/document-analysis/actions";
import { resolveSelectedPagesForAnalysis } from "@/src/lib/ai-review/document-analysis/resolve-selected-pages";
import { fetchAiReviewItemsForProjectAction } from "@/src/lib/ai-review/actions";
import type { AiReviewTradeFocus, DocumentAnalysisMode } from "@/src/lib/ai-review/document-analysis/types";
import {
  DEFAULT_DOCUMENT_ANALYSIS_MODE,
  DOCUMENT_ANALYSIS_MODE_LABELS,
} from "@/src/lib/ai-review/document-analysis/types";
import type {
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
  documentPages: DocumentPage[];
};

const ANALYSIS_QUICK_FILTER_TO_PRESET: Partial<
  Record<DrawingRegisterQuickFilter, PageSelectionPreset>
> = {
  demolition: "demolition",
  floor_plans: "floor_plans",
  partitions: "partitions",
  ceilings: "ceilings",
  schedules: "schedules",
  specifications: "specifications",
};

export function DocumentAnalysisPanel({
  projectId,
  documentPages,
}: DocumentAnalysisPanelProps) {
  const router = useRouter();
  const [isCatalogPending, startCatalogTransition] = useTransition();
  const [isMetadataPending, startMetadataTransition] = useTransition();
  const analysisRun = useAnalysisRunPolling(projectId);

  const [catalog, setCatalog] = useState<DocumentAnalysisCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tradeFocus, setTradeFocus] = useState<AiReviewTradeFocus>("General");
  const [analysisMode, setAnalysisMode] = useState<DocumentAnalysisMode>(
    DEFAULT_DOCUMENT_ANALYSIS_MODE
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [metadata, setMetadata] = useState<DocumentAnalysisMetadata | null>(
    null
  );
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [selectedRegisterIds, setSelectedRegisterIds] = useState<string[]>([]);
  const [registerFilter, setRegisterFilter] =
    useState<DrawingRegisterQuickFilter>("all");
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
      documentPages
        .filter((row) => row.document_id === selectedDocumentId)
        .sort((a, b) => a.page_number - b.page_number),
    [documentPages, selectedDocumentId]
  );

  const filteredRegisterRows = useMemo(
    () =>
      pagesForDocument.filter((row) =>
        matchesDrawingRegisterFilter(row.page_type, registerFilter)
      ),
    [pagesForDocument, registerFilter]
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
        selectedDocumentPageIds: selectedRegisterIds,
      },
      isPdf: true,
      pageCount: metadata?.pageCount ?? null,
      pageCountKnown: metadata?.pageCountKnown ?? false,
      documentPages: pagesForDocument,
      documentId: selectedDocumentId,
    });
  }, [
    isPdfSelected,
    selectedRegisterIds,
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
    const count = selectedRegisterIds.length || 1;
    const ratio = Math.min(1, count / totalPages);
    return Math.ceil(metadata.sizeBytes * ratio * 1.15);
  }, [metadata, selectedRegisterIds.length, isPdfSelected]);

  const loadMetadata = useCallback(
    (documentId: string) => {
      setMetadataError(null);
      setMetadata(null);
      setSelectedRegisterIds([]);
      setRegisterFilter("all");
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

  function toggleRegisterEntry(entryId: string) {
    setSelectedRegisterIds((current) => {
      if (current.includes(entryId)) {
        return current.filter((id) => id !== entryId);
      }
      if (current.length >= MAX_ANALYSIS_BATCH_PAGES) {
        setFormError(TOO_MANY_PAGES_MESSAGE);
        return current;
      }
      setFormError(null);
      return [...current, entryId];
    });
  }

  function selectRegisterIds(ids: string[]) {
    const unique = [...new Set(ids)].slice(0, MAX_ANALYSIS_BATCH_PAGES);
    if (ids.length > MAX_ANALYSIS_BATCH_PAGES) {
      setFormError(TOO_MANY_PAGES_MESSAGE);
    } else {
      setFormError(null);
    }
    setSelectedRegisterIds(unique);
  }

  function applyFirst10() {
    setFormError(null);
    selectRegisterIds(
      pagesForDocument.slice(0, MAX_ANALYSIS_BATCH_PAGES).map((row) => row.id)
    );
  }

  function applyQuickFilter(filter: DrawingRegisterQuickFilter) {
    setRegisterFilter(filter);
    if (filter === "all") {
      return;
    }

    const preset = ANALYSIS_QUICK_FILTER_TO_PRESET[filter];
    if (!preset) {
      return;
    }

    const pageCount =
      metadata?.pageCountKnown && metadata.pageCount
        ? metadata.pageCount
        : pagesForDocument.length || MAX_ANALYSIS_BATCH_PAGES;

    const pageNumbers = resolvePagePreset({
      preset,
      pageCount,
      selectedPages: [],
      documentPages: pagesForDocument,
      documentId: selectedDocumentId,
    });

    const ids = pagesForDocument
      .filter((row) => pageNumbers.includes(row.page_number))
      .map((row) => row.id);

    if (ids.length === 0) {
      setFormError(
        `No ${DRAWING_REGISTER_QUICK_FILTERS.find((item) => item.id === filter)?.label.toLowerCase() ?? "matching"} sheets in the register. Label sheets on the drawing register first.`
      );
      return;
    }

    setFormError(null);
    selectRegisterIds(ids);
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

    if (process.env.NODE_ENV === "development") {
      console.info("[document-analysis] run", {
        selectedDocumentId,
        selectedRegisterIds,
        parsedSelectedPages: pagesToSend,
        requestPayload: {
          projectId,
          documentId: selectedDocumentId,
          selectedDocumentPageIds: selectedRegisterIds,
          tradeFocus,
          analysisMode,
        },
      });
    }

    setFormError(null);
    setMetadataError(null);

    const started = await analysisRun.beginRun(() =>
      startDocumentAnalysisRunAction(projectId, {
        tradeFocus,
        analysisMode,
        documentId: selectedDocumentId,
        selectedDocumentPageIds: selectedRegisterIds,
      })
    );

    if (started.ok) {
      return;
    }

    setFormError(started.error ?? ANALYSIS_ERRORS.analysisFailed);
  }

  function handleAnalysisDismiss() {
    const wasComplete = analysisRun.phase === "complete";
    analysisRun.reset();
    if (wasComplete) {
      router.refresh();
    }
  }

  const formDisabled = analysisRun.isStarting || isMetadataPending;

  useEffect(() => {
    if (analysisRun.phase !== "complete") {
      return;
    }

    router.refresh();

    void fetchAiReviewItemsForProjectAction(projectId).then((response) => {
      console.info("[ai_review_items] client_refreshed", response.meta);
      window.dispatchEvent(
        new CustomEvent("quanta:ai-review-updated", {
          detail: { projectId, count: response.meta.rowCount },
        })
      );
    });
  }, [analysisRun.phase, projectId, router]);

  return (
    <div className="flex flex-col gap-5">
      <DocumentAnalysisStatusPanel
        projectId={projectId}
        phase={analysisRun.phase}
        stages={analysisRun.stages}
        progressPercent={analysisRun.progressPercent}
        result={analysisRun.result}
        errorMessage={analysisRun.errorMessage}
        errorCode={analysisRun.errorCode}
        onDismiss={handleAnalysisDismiss}
      />

      <p className="text-sm text-muted-foreground">
        AI suggestions are drafts. Review every suggestion before accepting it
        into your live takeoff. Analyse up to {MAX_ANALYSIS_BATCH_PAGES} pages
        per batch (25 MB).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="analysis-trade">Trade focus</Label>
          <Select
            value={tradeFocus}
            disabled={formDisabled}
            onValueChange={(value) => setTradeFocus(value as AiReviewTradeFocus)}
          >
            <SelectTrigger id="analysis-trade" className="w-full">
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

        <div className="space-y-1.5">
          <Label htmlFor="analysis-mode">Analysis mode</Label>
          <Select
            value={analysisMode}
            disabled={formDisabled}
            onValueChange={(value) =>
              setAnalysisMode(value as DocumentAnalysisMode)
            }
          >
            <SelectTrigger id="analysis-mode" className="w-full">
              <SelectValue placeholder="Select analysis mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scope_discovery">
                {DOCUMENT_ANALYSIS_MODE_LABELS.scope_discovery}
              </SelectItem>
              <SelectItem value="quantity_takeoff">
                {DOCUMENT_ANALYSIS_MODE_LABELS.quantity_takeoff}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {analysisMode === "scope_discovery"
              ? "Finds likely scope items for estimator review, even without measured quantities."
              : "Returns only items with measurable quantities or strong quantity evidence."}
          </p>
        </div>
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
              {selectedRegisterIds.length || "—"}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Drawing selection</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() =>
                document
                  .getElementById("drawing-register")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Edit drawing register
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={formDisabled || pagesForDocument.length === 0}
              onClick={applyFirst10}
            >
              First {MAX_ANALYSIS_BATCH_PAGES} sheets
            </Button>
            {DRAWING_REGISTER_QUICK_FILTERS.filter(
              (filter) => filter.id !== "all"
            ).map((filter) => (
              <Button
                key={filter.id}
                type="button"
                size="sm"
                variant={
                  registerFilter === filter.id ? "default" : "outline"
                }
                disabled={formDisabled || pagesForDocument.length === 0}
                onClick={() => applyQuickFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {pagesForDocument.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No drawing register for this PDF yet. Scroll to the drawing
              register below and click &quot;Create register from PDF&quot;.
            </p>
          ) : filteredRegisterRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sheets match this filter. Adjust drawing types in the register.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Sheet no</TableHead>
                    <TableHead>Drawing name</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Revision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegisterRows.map((row) => {
                    const checked = selectedRegisterIds.includes(row.id);
                    const label =
                      row.sheet_number ||
                      row.sheet_title ||
                      `Page ${row.page_number}`;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="size-3.5 rounded border"
                            checked={checked}
                            disabled={formDisabled}
                            aria-label={`Select ${label}`}
                            onChange={() => toggleRegisterEntry(row.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.sheet_number || "—"}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs">
                          {row.sheet_title || "—"}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-xs">
                          {row.page_number}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.page_type
                            ? DRAWING_REGISTER_TYPE_LABELS[row.page_type]
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.revision || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {effectiveSelectedPages.length > 0 ? (
            <p className="text-sm text-foreground">
              <span className="font-mono tabular-nums">
                {effectiveSelectedPages.length} sheet
                {effectiveSelectedPages.length === 1 ? "" : "s"} selected
              </span>
              {" · PDF pages "}
              <span className="font-mono tabular-nums text-muted-foreground">
                {effectiveSelectedPages.join(", ")}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select drawings from the register above, or use a quick filter.
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
            analysisRun.isRunning ||
            pdfAndImageCatalog.length === 0 ||
            !selectedDocumentId
          }
          onClick={() => void runAnalysis()}
        >
          {analysisRun.isStarting
            ? "Starting…"
            : analysisRun.isRunning
              ? "Analysis running…"
              : "Run analysis"}
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
