"use client";

import { DocumentPreviewContent } from "@/components/documents/document-preview-content";
import { useDocumentSignedUrl } from "@/components/documents/use-document-signed-url";
import { TakeoffSourceDetails } from "@/components/takeoff/takeoff-source-details";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolvePageNumberFromSelection } from "@/src/lib/takeoff/drawing-reference";
import type {
  Document,
  DocumentPage,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type TakeoffSourceDialogProps = {
  item: TakeoffItem | null;
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  assembly: TakeoffItemAssemblyWithPackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TakeoffSourceDialog({
  item,
  projectId,
  documents,
  documentPages,
  assembly,
  open,
  onOpenChange,
}: TakeoffSourceDialogProps) {
  const sourceDocument = item?.source_document_id
    ? documents.find((doc) => doc.id === item.source_document_id)
    : undefined;

  const pageNumberHint = item
    ? resolvePageNumberFromSelection(
        item.document_page_id,
        item.page_number,
        documentPages
      )
    : null;

  const { signedUrl, error, loading } = useDocumentSignedUrl(
    sourceDocument?.id ?? null,
    projectId,
    open && Boolean(sourceDocument)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 overflow-hidden p-4 sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="pr-8">Takeoff source</DialogTitle>
          <DialogDescription>
            Review the linked drawing or document against this quantity line.
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
                  pageNumberHint={pageNumberHint}
                />
              )}
            </section>

            <section className="lg:overflow-y-auto">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Takeoff line
              </p>
              <TakeoffSourceDetails
                item={item}
                documents={documents}
                documentPages={documentPages}
                assembly={assembly}
              />
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
