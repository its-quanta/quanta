"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DRAWING_REGISTER_PAGE_TYPES,
  DRAWING_REGISTER_QUICK_FILTERS,
  DRAWING_REGISTER_TYPE_LABELS,
  matchesDrawingRegisterFilter,
  type DrawingRegisterQuickFilter,
} from "@/src/lib/documents/drawing-register/constants";
import {
  seedDrawingRegisterAction,
  updateDrawingRegisterEntryAction,
} from "@/src/lib/documents/drawing-register/actions";
import { isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import type { Document, DocumentPage, DocumentPageType } from "@/src/types/database";

type DrawingRegisterPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
};

type DraftRow = {
  sheetNumber: string;
  sheetTitle: string;
  pageType: string;
  revision: string;
};

function buildDraft(row: DocumentPage): DraftRow {
  return {
    sheetNumber: row.sheet_number ?? "",
    sheetTitle: row.sheet_title ?? "",
    pageType: row.page_type ?? "",
    revision: row.revision ?? "",
  };
}

export function DrawingRegisterPanel({
  projectId,
  documents,
  documentPages,
}: DrawingRegisterPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] =
    useState<DrawingRegisterQuickFilter>("all");
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});

  const pdfDocuments = useMemo(
    () => documents.filter((doc) => isPdfMimeType(doc.file_type)),
    [documents]
  );

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(
    () => pdfDocuments[0]?.id ?? ""
  );

  const effectiveDocumentId =
    pdfDocuments.some((doc) => doc.id === selectedDocumentId)
      ? selectedDocumentId
      : (pdfDocuments[0]?.id ?? "");

  const registerRows = useMemo(
    () =>
      documentPages
        .filter((row) => row.document_id === effectiveDocumentId)
        .sort((a, b) => a.page_number - b.page_number),
    [documentPages, effectiveDocumentId]
  );

  const filteredRows = useMemo(
    () =>
      registerRows.filter((row) =>
        matchesDrawingRegisterFilter(row.page_type, quickFilter)
      ),
    [registerRows, quickFilter]
  );

  const selectedDocument = pdfDocuments.find(
    (doc) => doc.id === effectiveDocumentId
  );

  const getDraft = useCallback(
    (row: DocumentPage): DraftRow => drafts[row.id] ?? buildDraft(row),
    [drafts]
  );

  function updateDraft(rowId: string, row: DocumentPage, patch: Partial<DraftRow>) {
    setDrafts((current) => ({
      ...current,
      [rowId]: { ...getDraft(row), ...patch },
    }));
  }

  function saveRow(row: DocumentPage) {
    const draft = getDraft(row);
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateDrawingRegisterEntryAction(projectId, {
        id: row.id,
        sheetNumber: draft.sheetNumber,
        sheetTitle: draft.sheetTitle,
        pageType: draft.pageType
          ? (draft.pageType as DocumentPageType)
          : null,
        revision: draft.revision,
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Drawing register saved.");
      router.refresh();
    });
  }

  function populateRegister() {
    if (!effectiveDocumentId) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await seedDrawingRegisterAction(
        projectId,
        effectiveDocumentId
      );

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage(
        result.pageCount
          ? `Drawing register created with ${result.pageCount} pages.`
          : "Drawing register updated."
      );
      router.refresh();
    });
  }

  return (
    <Card id="drawing-register">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Drawing register</CardTitle>
            <CardDescription>
              Identify each PDF page with a sheet number, drawing name, and type.
              AI-assisted extraction can be added later — edit manually for now.
            </CardDescription>
          </div>
          {registerRows.length > 0 ? (
            <Badge variant="outline">{registerRows.length} sheets</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pdfDocuments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Upload a PDF to build a drawing register. Each page will be listed
            so you can label sheets without guessing page numbers.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-[14rem] flex-1 space-y-1.5">
                <Label htmlFor="drawing-register-document">PDF document</Label>
                <Select
                  value={effectiveDocumentId}
                  onValueChange={setSelectedDocumentId}
                  disabled={isPending}
                >
                  <SelectTrigger id="drawing-register-document">
                    <SelectValue placeholder="Select a PDF" />
                  </SelectTrigger>
                  <SelectContent>
                    {pdfDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.file_name}
                        {doc.page_count != null
                          ? ` (${doc.page_count} pp)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || !effectiveDocumentId}
                onClick={populateRegister}
              >
                {registerRows.length === 0
                  ? "Create register from PDF"
                  : "Refresh pages from PDF"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {DRAWING_REGISTER_QUICK_FILTERS.map((filter) => (
                <Button
                  key={filter.id}
                  type="button"
                  size="sm"
                  variant={quickFilter === filter.id ? "default" : "outline"}
                  disabled={isPending}
                  onClick={() => setQuickFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="text-sm text-muted-foreground" role="status">
                {successMessage}
              </p>
            ) : null}

            {registerRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                {selectedDocument?.file_name ?? "This PDF"} has no register
                entries yet. Click &quot;Create register from PDF&quot; to add
                one row per page.
              </p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sheets match this filter. Change the filter or assign drawing
                types in the table.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sheet no</TableHead>
                    <TableHead>Drawing name</TableHead>
                    <TableHead className="w-16">Page</TableHead>
                    <TableHead>Drawing type</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const draft = getDraft(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={draft.sheetNumber}
                            placeholder="e.g. A-101"
                            disabled={isPending}
                            onChange={(event) =>
                              updateDraft(row.id, row, {
                                sheetNumber: event.target.value,
                              })
                            }
                            onBlur={() => saveRow(row)}
                            className="h-8 min-w-[6rem]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draft.sheetTitle}
                            placeholder="e.g. Ground floor plan"
                            disabled={isPending}
                            onChange={(event) =>
                              updateDraft(row.id, row, {
                                sheetTitle: event.target.value,
                              })
                            }
                            onBlur={() => saveRow(row)}
                            className="h-8 min-w-[10rem]"
                          />
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {row.page_number}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={draft.pageType || "unset"}
                            disabled={isPending}
                            onValueChange={(value) => {
                              const pageType =
                                value === "unset" ? "" : value;
                              updateDraft(row.id, row, { pageType });
                              const nextDraft = {
                                ...draft,
                                pageType,
                              };
                              startTransition(async () => {
                                const result =
                                  await updateDrawingRegisterEntryAction(
                                    projectId,
                                    {
                                      id: row.id,
                                      pageType: pageType
                                        ? (pageType as DocumentPageType)
                                        : null,
                                      sheetNumber: nextDraft.sheetNumber,
                                      sheetTitle: nextDraft.sheetTitle,
                                      revision: nextDraft.revision,
                                    }
                                  );
                                if (result.error) {
                                  setErrorMessage(result.error);
                                  return;
                                }
                                router.refresh();
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-full min-w-[8rem]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">—</SelectItem>
                              {DRAWING_REGISTER_PAGE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {DRAWING_REGISTER_TYPE_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draft.revision}
                            placeholder="e.g. P01"
                            disabled={isPending}
                            onChange={(event) =>
                              updateDraft(row.id, row, {
                                revision: event.target.value,
                              })
                            }
                            onBlur={() => saveRow(row)}
                            className="h-8 min-w-[4rem]"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => saveRow(row)}
                          >
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
