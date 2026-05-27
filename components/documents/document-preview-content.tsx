"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DOCUMENT_CLASSIFICATION_LABELS,
  fileTypeLabel,
} from "@/src/lib/documents/constants";
import { getDocumentPreviewKind } from "@/src/lib/documents/preview";
import { formatDate } from "@/src/lib/format";
import type { Document } from "@/src/types/database";

type DocumentPreviewContentProps = {
  document: Document;
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
  /** Shown when PDF is linked to a takeoff page (navigation not implemented). */
  pageNumberHint?: number | null;
};

export function DocumentPreviewContent({
  document,
  signedUrl,
  loading,
  error,
  pageNumberHint,
}: DocumentPreviewContentProps) {
  const [embedFailed, setEmbedFailed] = useState(false);
  const previewKind = getDocumentPreviewKind(document.file_type);

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-border bg-muted/20">
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
        <p className="text-sm text-muted-foreground">No preview available.</p>
      </div>
    );
  }

  if (previewKind === "pdf") {
    // TODO: Navigate PDF viewer to pageNumberHint when page-level deep linking is implemented.
    if (embedFailed) {
      return (
        <UnsupportedPreviewFallback
          document={document}
          signedUrl={signedUrl}
          pageNumberHint={pageNumberHint}
          message="Embedded PDF preview is unavailable in this browser."
        />
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {pageNumberHint !== null && pageNumberHint !== undefined ? (
          <p className="text-xs text-muted-foreground">
            Linked page: {pageNumberHint}. Page navigation in the viewer is not
            available yet.
          </p>
        ) : null}
        <iframe
          title={document.file_name}
          src={signedUrl}
          className="h-[min(78vh,720px)] w-full rounded-lg border border-border bg-muted/10"
          onError={() => setEmbedFailed(true)}
        />
        <p className="text-xs text-muted-foreground">
          If the preview does not load, use Open in new tab below.
        </p>
      </div>
    );
  }

  if (previewKind === "image") {
    return (
      <div className="flex max-h-[min(70vh,560px)] items-center justify-center overflow-auto rounded-lg border border-border bg-muted/10 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={document.file_name}
          className="max-h-[min(68vh,540px)] w-auto max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <UnsupportedPreviewFallback
      document={document}
      signedUrl={signedUrl}
      pageNumberHint={pageNumberHint}
    />
  );
}

function UnsupportedPreviewFallback({
  document,
  signedUrl,
  pageNumberHint,
  message,
}: {
  document: Document;
  signedUrl: string;
  pageNumberHint?: number | null;
  message?: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4">
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Inline preview is not available for this file type. Download the file
          to open it locally.
        </p>
      )}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">File name</dt>
          <dd className="mt-0.5 font-medium">{document.file_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Type</dt>
          <dd className="mt-0.5 font-mono text-xs tabular-nums">
            {fileTypeLabel(document.file_type)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Classification</dt>
          <dd className="mt-0.5">
            {DOCUMENT_CLASSIFICATION_LABELS[document.document_type]}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Uploaded</dt>
          <dd className="mt-0.5 font-mono text-xs tabular-nums">
            {formatDate(document.created_at)}
          </dd>
        </div>
        {pageNumberHint !== null && pageNumberHint !== undefined ? (
          <div>
            <dt className="text-xs text-muted-foreground">Linked page</dt>
            <dd className="mt-0.5 font-mono text-xs tabular-nums">
              {pageNumberHint}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={signedUrl} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={signedUrl} download={document.file_name}>
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}
