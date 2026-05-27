import { getImportDefinition } from "@/src/lib/imports/definitions";
import type { ImportType } from "@/src/lib/imports/types";

export function buildImportTemplateCsv(importType: ImportType): string {
  const definition = getImportDefinition(importType);
  if (!definition) {
    return "";
  }

  const headers = definition.fields.map((field) => field.label);
  const example = definition.fields.map((field) => field.example);
  return `${headers.join(",")}\n${example.join(",")}\n`;
}

export function downloadImportTemplate(importType: ImportType): void {
  const definition = getImportDefinition(importType);
  if (!definition) {
    return;
  }

  const csv = buildImportTemplateCsv(importType);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Quanta_${definition.title.replace(/\s+/g, "_")}_Template.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildFailureReportCsv(
  failures: { rowNumber: number; reason: string; originalValue: string }[]
): string {
  const lines = ["Row,Reason,Original value"];
  for (const failure of failures) {
    const escaped = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;
    lines.push(
      `${failure.rowNumber},${escaped(failure.reason)},${escaped(failure.originalValue)}`
    );
  }
  return lines.join("\n");
}

export function downloadFailureReport(
  failures: { rowNumber: number; reason: string; originalValue: string }[],
  importType: string
): void {
  const csv = buildFailureReportCsv(failures);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Quanta_Import_Failures_${importType}_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
