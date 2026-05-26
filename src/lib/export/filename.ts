import type { ExportType } from "@/src/lib/export/types";
import { EXPORT_TYPES } from "@/src/lib/export/types";

export function sanitiseExportProjectName(name: string): string {
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!cleaned) {
    return "Project";
  }

  return cleaned.slice(0, 60);
}

export function formatExportDateStamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildExportFileName(
  projectName: string,
  exportType: ExportType,
  date: Date = new Date()
): string {
  const meta = EXPORT_TYPES.find((entry) => entry.id === exportType);
  const label = meta?.fileLabel ?? "Export";
  const safeName = sanitiseExportProjectName(projectName);
  const stamp = formatExportDateStamp(date);
  return `${safeName}_${label}_${stamp}.xlsx`;
}

export function estimateExportSizeBytes(rowCount: number, columnCount: number): number {
  return Math.max(4096, rowCount * columnCount * 48);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
