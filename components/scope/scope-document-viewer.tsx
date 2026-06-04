"use client";

import { memo, useMemo, type ReactNode } from "react";

import { normalizeViewerPage } from "@/components/scope/scope-viewer-navigation";
import { useScopeDocumentSignedUrl } from "@/components/scope/use-scope-document-signed-url";
import { cn } from "@/lib/utils";
import { getDocumentPreviewKind } from "@/src/lib/documents/preview";
import type { Document } from "@/src/types/database";

type ScopeDocumentViewerProps = {
  projectId: string;
  document: Document | null;
  activePage: number | null;
};

function buildPdfPageUrl(baseUrl: string, page: number | null): string {
  const clean = baseUrl.split("#")[0];
  const normalized = normalizeViewerPage(page);
  if (normalized == null) {
    return clean;
  }
  return `${clean}#page=${normalized}`;
}

const ScopePdfCanvas = memo(function ScopePdfCanvas({
  document,
  iframeSrc,
  reloadKey,
}: {
  document: Document;
  iframeSrc: string;
  reloadKey: string;
}) {
  return (
    <iframe
      key={reloadKey}
      title={document.file_name}
      src={iframeSrc}
      className="absolute inset-0 h-full w-full border-0 bg-muted/10"
    />
  );
});

const ScopeImageCanvas = memo(function ScopeImageCanvas({
  document,
  signedUrl,
}: {
  document: Document;
  signedUrl: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/10 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={signedUrl}
        alt={document.file_name}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
});

function ViewerFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden border border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

function ScopeDocumentViewerInner({
  projectId,
  document,
  activePage,
}: ScopeDocumentViewerProps) {
  const { signedUrl, error, loading } = useScopeDocumentSignedUrl(
    document?.id ?? null,
    projectId
  );

  const previewKind = document ? getDocumentPreviewKind(document.file_type) : null;
  const viewerPage = normalizeViewerPage(activePage);

  const iframeSrc = useMemo(() => {
    if (!signedUrl || previewKind !== "pdf") {
      return null;
    }
    return buildPdfPageUrl(signedUrl, viewerPage);
  }, [signedUrl, viewerPage, previewKind]);

  const pdfReloadKey = useMemo(() => {
    if (!document) {
      return "none";
    }
    return `${document.id}-p${viewerPage ?? 0}`;
  }, [document, viewerPage]);

  if (!document) {
    return (
      <ViewerFrame className="bg-muted/15">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select a document to preview
        </div>
      </ViewerFrame>
    );
  }

  if (loading) {
    return (
      <ViewerFrame className="bg-muted/15">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading drawing…</p>
        </div>
      </ViewerFrame>
    );
  }

  if (error || !signedUrl) {
    return (
      <ViewerFrame className="border-dashed bg-muted/15">
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {error ?? "Preview unavailable."}
        </div>
      </ViewerFrame>
    );
  }

  if (previewKind === "image") {
    return (
      <ViewerFrame>
        <ScopeImageCanvas document={document} signedUrl={signedUrl} />
      </ViewerFrame>
    );
  }

  if (previewKind === "pdf" && iframeSrc) {
    return (
      <ViewerFrame className="h-full">
        <ScopePdfCanvas
          document={document}
          iframeSrc={iframeSrc}
          reloadKey={pdfReloadKey}
        />
      </ViewerFrame>
    );
  }

  return (
    <ViewerFrame className="bg-muted/15">
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Preview not supported for this file type.
      </div>
    </ViewerFrame>
  );
}

function viewerPropsAreEqual(
  prev: ScopeDocumentViewerProps,
  next: ScopeDocumentViewerProps
): boolean {
  return (
    prev.projectId === next.projectId &&
    prev.document?.id === next.document?.id &&
    normalizeViewerPage(prev.activePage) === normalizeViewerPage(next.activePage)
  );
}

export const ScopeDocumentViewer = memo(
  ScopeDocumentViewerInner,
  viewerPropsAreEqual
);
