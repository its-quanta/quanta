"use client";

import type { ParsedImportFile } from "@/src/lib/imports/types";

function normaliseHeader(value: string): string {
  return value.trim();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string, fileName: string): ParsedImportFile {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { fileName, columns: [], rows: [] };
  }

  const columns = parseCsvLine(lines[0]).map(normaliseHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    columns.forEach((column, index) => {
      record[column] = values[index] ?? "";
    });
    return record;
  });

  return { fileName, columns, rows };
}

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const text = await file.text();
    return parseCsvText(text, file.name);
  }

  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
    throw new Error("Unsupported file type. Upload CSV or XLSX.");
  }

  const XLSX = await import("xlsx-js-style");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { fileName: file.name, columns: [], rows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "" }
  );

  if (matrix.length === 0) {
    return { fileName: file.name, columns: [], rows: [] };
  }

  const headerRow = matrix[0] ?? [];
  const columns = headerRow.map((cell) =>
    normaliseHeader(String(cell ?? ""))
  ).filter((column) => column.length > 0);

  const rows = matrix.slice(1).map((row) => {
    const record: Record<string, string> = {};
    columns.forEach((column, index) => {
      record[column] = String(row[index] ?? "").trim();
    });
    return record;
  }).filter((row) => Object.values(row).some((value) => value.trim().length > 0));

  return { fileName: file.name, columns, rows };
}
