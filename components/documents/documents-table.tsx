"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  Download04Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";

import { DocumentProcessingBadge } from "@/components/documents/document-processing-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/src/lib/format";
import {
  DOCUMENT_CLASSIFICATION_LABELS,
  fileTypeLabel,
} from "@/src/lib/documents/constants";
import {
  deleteDocumentAction,
  getDocumentSignedUrlAction,
} from "@/src/lib/documents/actions";
import type { Document } from "@/src/types/database";

type DocumentsTableProps = {
  documents: Document[];
  projectId: string;
};

export function DocumentsTable({ documents, projectId }: DocumentsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  function openDocument(documentId: string) {
    setActionError(null);
    setPendingDocumentId(documentId);

    startTransition(async () => {
      const result = await getDocumentSignedUrlAction(documentId, projectId);

      setPendingDocumentId(null);

      if (result.error || !result.signedUrl) {
        setActionError(result.error ?? "Could not open document.");
        return;
      }

      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    });
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setActionError(null);
    setPendingDocumentId(deleteTarget.id);

    startTransition(async () => {
      const result = await deleteDocumentAction(deleteTarget.id, projectId);

      setPendingDocumentId(null);
      setDeleteTarget(null);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No documents yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload drawings, specifications, or schedules to start this tender
          workspace.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead scope="col">File name</TableHead>
              <TableHead scope="col">Document type</TableHead>
              <TableHead scope="col">File type</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">Uploaded</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => {
              const isRowPending = pendingDocumentId === document.id && isPending;

              return (
                <TableRow key={document.id} className="hover:bg-muted/20">
                  <TableCell className="max-w-[220px] truncate font-medium">
                    {document.file_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {DOCUMENT_CLASSIFICATION_LABELS[document.document_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {fileTypeLabel(document.file_type)}
                  </TableCell>
                  <TableCell>
                    <DocumentProcessingBadge
                      status={document.processing_status}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDate(document.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={
                          isRowPending ||
                          document.processing_status !== "ready"
                        }
                        onClick={() => openDocument(document.id)}
                        aria-label={`View ${document.file_name}`}
                      >
                        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={
                          isRowPending ||
                          document.processing_status !== "ready"
                        }
                        onClick={() => openDocument(document.id)}
                        aria-label={`Download ${document.file_name}`}
                      >
                        <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isRowPending}
                        onClick={() => setDeleteTarget(document)}
                        aria-label={`Delete ${document.file_name}`}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          strokeWidth={2}
                          className="text-destructive"
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {actionError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Remove {deleteTarget?.file_name} from this project? This deletes
              the file from storage and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
