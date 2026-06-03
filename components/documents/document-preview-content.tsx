"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DOCUMENT_CLASSIFICATION_LABELS,
  fileTypeLabel,
} from "@/src/lib/documents/constants";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
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
      <PreviewUnavailableState
        document={document}
        signedUrl={null}
        message={ANALYSIS_ERRORS.previewFailed}
        pageNumberHint={pageNumberHint}
      />
    );
  }

  if (!signedUrl) {
    return (
      <PreviewUnavailableState
        document={document}
        signedUrl={null}
        message="Preview unavailable. Open in new tab."
        pageNumberHint={pageNumberHint}
      />
    );
  }

  if (previewKind === "pdf") {
    // TODO: Navigate PDF viewer to pageNumberHint when page-level deep linking is implemented.
    if (embedFailed) {
      return (
        <PreviewUnavailableState
          document={document}
          signedUrl={signedUrl}
          pageNumberHint={pageNumberHint}
          message="Preview unavailable. Open in new tab."
        />
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {pageNumberHint !== null && pageNumberHint !== undefined ? (
          <p className="text-xs text-muted-foreground">
            Linked to page {pageNumberHint}.
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
    <PreviewUnavailableState
      document={document}
      signedUrl={signedUrl}
      pageNumberHint={pageNumberHint}
      message="Preview unavailable. Open in new tab."
    />
  );
}

function PreviewUnavailableState({
  document,
  signedUrl,
  pageNumberHint,
  message,
}: {
  document: Document;
  signedUrl: string | null;
  pageNumberHint?: number | null;
  message: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground" role="status">
        {message}
      </p>
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
      {signedUrl ? (
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
      ) : null}
    </div>
  );
}
