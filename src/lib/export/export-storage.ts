import type { ExportType, StoredExportMeta } from "@/src/lib/export/types";

function storageKey(projectId: string, exportType: ExportType): string {
  return `quanta-export:${projectId}:${exportType}`;
}

export function readExportMeta(
  projectId: string,
  exportType: ExportType
): StoredExportMeta | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(projectId, exportType));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredExportMeta;
  } catch {
    return null;
  }
}

export function writeExportMeta(
  projectId: string,
  exportType: ExportType,
  meta: StoredExportMeta
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      storageKey(projectId, exportType),
      JSON.stringify(meta)
    );
  } catch {
    // Ignore quota errors — export still succeeded
  }
}
