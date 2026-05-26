"use client";

import { DocumentPreviewContent } from "@/components/documents/document-preview-content";
import { useDocumentSignedUrl } from "@/components/documents/use-document-signed-url";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Document } from "@/src/types/database";

type DocumentPreviewDialogProps = {
  document: Document | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageNumberHint?: number | null;
};

export function DocumentPreviewDialog({
  document,
  projectId,
  open,
  onOpenChange,
  pageNumberHint,
}: DocumentPreviewDialogProps) {
  const { signedUrl, error, loading } = useDocumentSignedUrl(
    document?.id ?? null,
    projectId,
    open && Boolean(document)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {document?.file_name ?? "Document preview"}
          </DialogTitle>
          <DialogDescription>
            Private preview via signed URL. Files are not publicly accessible.
          </DialogDescription>
        </DialogHeader>

        {document ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DocumentPreviewContent
              document={document}
              signedUrl={signedUrl}
              loading={loading}
              error={error}
              pageNumberHint={pageNumberHint}
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {signedUrl ? (
              <>
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    Open in new tab
                  </a>
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <a
                    href={signedUrl}
                    download={document?.file_name}
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </Button>
              </>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
