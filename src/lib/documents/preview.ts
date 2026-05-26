import type { Document } from "@/src/types/database";

export type DocumentPreviewKind = "pdf" | "image" | "unsupported";

export function getDocumentPreviewKind(
  fileType: string
): DocumentPreviewKind {
  if (fileType === "application/pdf") {
    return "pdf";
  }

  if (fileType === "image/png" || fileType === "image/jpeg") {
    return "image";
  }

  return "unsupported";
}

export function documentSupportsInlinePreview(document: Document): boolean {
  return getDocumentPreviewKind(document.file_type) !== "unsupported";
}
