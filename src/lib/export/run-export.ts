import { buildExport } from "@/src/lib/export/build-export-data";
import {
  triggerBrowserDownload,
  writeExportWorkbook,
} from "@/src/lib/export/excel-workbook";
import { writeExportMeta } from "@/src/lib/export/export-storage";
import type { ExportProjectData, ExportType } from "@/src/lib/export/types";

export type RunExportResult = {
  fileName: string;
  rowCount: number;
  sizeBytes: number;
};

export async function runProjectExport(
  exportType: ExportType,
  data: ExportProjectData
): Promise<RunExportResult> {
  const built = buildExport(exportType, data);
  const { buffer, sizeBytes } = await writeExportWorkbook(built, data.currency);

  triggerBrowserDownload(buffer, built.fileName);

  writeExportMeta(data.project.id, exportType, {
    exportedAt: new Date().toISOString(),
    rowCount: built.rowCount,
    sizeBytes,
  });

  return {
    fileName: built.fileName,
    rowCount: built.rowCount,
    sizeBytes,
  };
}
