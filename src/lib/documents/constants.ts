import type {
  DocumentClassification,
  DocumentProcessingStatus,
} from "@/src/types/database";

export const PROJECT_DOCUMENTS_BUCKET = "project-documents";

export const MAX_DOCUMENT_SIZE_BYTES = 52_428_800; // 50 MB

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type AllowedDocumentMimeType =
  (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export const DOCUMENT_MIME_EXTENSIONS: Record<
  AllowedDocumentMimeType,
  string[]
> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

export const DOCUMENT_CLASSIFICATIONS: {
  value: DocumentClassification;
  label: string;
}[] = [
  { value: "architectural_drawings", label: "Architectural Drawings" },
  { value: "structural_drawings", label: "Structural Drawings" },
  { value: "specification", label: "Specification" },
  { value: "schedule", label: "Schedule" },
  { value: "scope_document", label: "Scope Document" },
  { value: "photos_images", label: "Photos / Images" },
  { value: "other", label: "Other" },
];

export const DOCUMENT_CLASSIFICATION_LABELS: Record<
  DocumentClassification,
  string
> = Object.fromEntries(
  DOCUMENT_CLASSIFICATIONS.map((item) => [item.value, item.label])
) as Record<DocumentClassification, string>;

export const PROCESSING_STATUS_LABELS: Record<
  DocumentProcessingStatus,
  string
> = {
  pending: "Pending",
  ready: "Ready",
  failed: "Failed",
};

export const SIGNED_URL_TTL_SECONDS = 3600;

export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/[/\\]/g, "_").replace(/\s+/g, " ").trim();
  return base.length > 0 ? base.slice(0, 200) : "document";
}

export function buildStoragePath(
  organisationId: string,
  projectId: string,
  fileName: string
): string {
  const safeName = sanitizeFileName(fileName);
  return `${organisationId}/${projectId}/${Date.now()}-${safeName}`;
}

export function isAllowedMimeType(
  mimeType: string
): mimeType is AllowedDocumentMimeType {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function fileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/jpeg") return "JPEG";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "XLSX";
  }
  return mimeType;
}

export function acceptAttributeForFilePicker(): string {
  return [
    ...ALLOWED_DOCUMENT_MIME_TYPES,
    ...Object.values(DOCUMENT_MIME_EXTENSIONS).flat(),
  ].join(",");
}

export function validateDocumentFile(file: File): string | null {
  if (file.size === 0) {
    return "Choose a file to upload.";
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "File exceeds the 50 MB limit.";
  }

  if (isAllowedMimeType(file.type)) {
    return null;
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";

  const allowedExtensions = Object.values(DOCUMENT_MIME_EXTENSIONS).flat();

  if (allowedExtensions.includes(extension)) {
    return null;
  }

  return "Unsupported file type. Allowed: PDF, PNG, JPG, DOCX, XLSX.";
}

export function resolveDocumentMimeType(file: File): string {
  if (file.type && isAllowedMimeType(file.type)) {
    return file.type;
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";

  for (const [mimeType, extensions] of Object.entries(DOCUMENT_MIME_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return mimeType;
    }
  }

  return file.type || "application/octet-stream";
}
