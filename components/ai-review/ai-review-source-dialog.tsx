"use client";

import { DocumentPreviewContent } from "@/components/documents/document-preview-content";
import { useDocumentSignedUrl } from "@/components/documents/use-document-signed-url";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type {
  AiReviewItem,
  Document,
  DocumentPage,
} from "@/src/types/database";

type AiReviewSourceDialogProps = {
  item: AiReviewItem | null;
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AiReviewSourceDialog({
  item,
  projectId,
  documents,
  documentPages,
  open,
  onOpenChange,
}: AiReviewSourceDialogProps) {
  const sourceDocument = item?.source_document_id
    ? documents.find((doc) => doc.id === item.source_document_id)
    : undefined;

  const { signedUrl, error, loading } = useDocumentSignedUrl(
    sourceDocument?.id ?? null,
    projectId,
    open && Boolean(sourceDocument)
  );

  const context = buildDrawingReferenceContext(documents, documentPages);
  const documentName = item?.source_document_id
    ? context.documentNames.get(item.source_document_id)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 overflow-hidden p-4 sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="pr-8">Source reference</DialogTitle>
          <DialogDescription>
            Review the linked drawing against this AI suggestion.
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
            <section className="flex min-h-[240px] flex-col gap-2 lg:min-h-0 lg:overflow-y-auto">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Document
              </p>
              {!sourceDocument ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No source document linked yet.
                  </p>
                </div>
              ) : (
                <DocumentPreviewContent
                  document={sourceDocument}
                  signedUrl={signedUrl}
                  loading={loading}
                  error={error}
                  pageNumberHint={item.page_number}
                />
              )}
            </section>

            <section className="lg:overflow-y-auto">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggestion
              </p>
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.description}</CardTitle>
                  <CardDescription>
                    {item.trade} · {item.quantity} {item.unit}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Document</dt>
                      <dd className="mt-0.5">{documentName ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Drawing ref</dt>
                      <dd className="mt-0.5 font-mono text-xs">
                        {item.drawing_reference ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Sheet</dt>
                      <dd className="mt-0.5 font-mono text-xs">
                        {item.sheet_number ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Page</dt>
                      <dd className="mt-0.5 font-mono text-xs">
                        {item.page_number ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  {item.reasoning ? (
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Reasoning
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {item.reasoning}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
