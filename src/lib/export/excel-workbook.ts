import type { OrganisationCurrency } from "@/src/types/database";

import type { BuiltExport, ExportSheetDefinition } from "./types";

type XlsxModule = typeof import("xlsx-js-style");

const HEADER_FILL = "F4F6FA";
const HEADER_FONT = "0A0E1A";
const BORDER = "E5E8EE";
const GREEN = "10B981";
const RED = "EF4444";

const CURRENCY_FORMAT: Record<OrganisationCurrency, string> = {
  NZD: '"$"#,##0.00',
  AUD: '"$"#,##0.00',
  USD: '"$"#,##0.00',
  GBP: '"£"#,##0.00',
  EUR: '#,##0.00" €"',
};

const PERCENT_FORMAT = "0.0%";

function colLetter(index: number): string {
  let letter = "";
  let n = index;

  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }

  return letter;
}

function sanitiseSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
  return cleaned.length > 0 ? cleaned : "Sheet";
}

function headerStyle() {
  return {
    font: { bold: true, color: { rgb: HEADER_FONT }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      bottom: { style: "thin", color: { rgb: BORDER } },
    },
  };
}

function buildWorksheet(
  sheet: ExportSheetDefinition,
  currency: OrganisationCurrency,
  XLSX: XlsxModule
): import("xlsx-js-style").WorkSheet {
  const aoa = [sheet.headers, ...sheet.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellStyles: true });

  const currencyFormat = CURRENCY_FORMAT[currency];
  const colCount = sheet.headers.length;

  for (let column = 0; column < colCount; column += 1) {
    const address = `${colLetter(column)}1`;
    if (ws[address]) {
      ws[address].s = headerStyle();
    }
  }

  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const excelRow = rowIndex + 2;
    const isRiskRow = sheet.riskFlagRowIndexes?.includes(rowIndex);

    for (let column = 0; column < colCount; column += 1) {
      const address = `${colLetter(column)}${excelRow}`;
      const cell = ws[address];
      if (!cell) {
        continue;
      }

      const value = sheet.rows[rowIndex][column];
      const style: Record<string, unknown> = {
        alignment: { vertical: "top", wrapText: column === 1 },
      };

      if (typeof value === "number") {
        cell.t = "n";

        if (sheet.percentColumnIndexes?.includes(column)) {
          cell.z = PERCENT_FORMAT;
        } else if (sheet.currencyColumnIndexes?.includes(column)) {
          cell.z = currencyFormat;
        }

        if (
          sheet.marginPercentColumnIndex === column &&
          value > 0
        ) {
          style.font = { color: { rgb: GREEN } };
        }
      }

      if (isRiskRow && column === 1 && typeof value === "string") {
        style.font = { color: { rgb: RED }, bold: true };
      }

      if (Object.keys(style).length > 0) {
        cell.s = style;
      }
    }
  }

  ws["!cols"] = sheet.headers.map((header, columnIndex) => {
    const maxLen = Math.max(
      header.length,
      ...sheet.rows.map((row) => {
        const value = row[columnIndex];
        return value === null || value === undefined
          ? 0
          : String(value).length;
      })
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 48) };
  });

  ws["!views"] = [
    {
      state: "frozen",
      ySplit: 1,
      topLeftCell: "A2",
      activeCell: "A2",
    },
  ];

  return ws;
}

export type ExcelWriteResult = {
  buffer: ArrayBuffer;
  sizeBytes: number;
};

export async function writeExportWorkbook(
  built: BuiltExport,
  currency: OrganisationCurrency
): Promise<ExcelWriteResult> {
  const XLSX = await import("xlsx-js-style");

  const wb = XLSX.utils.book_new();

  for (const sheet of built.sheets) {
    const ws = buildWorksheet(sheet, currency, XLSX);
    XLSX.utils.book_append_sheet(wb, ws, sanitiseSheetName(sheet.sheetName));
  }

  const output = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  }) as ArrayBuffer;

  return {
    buffer: output,
    sizeBytes: output.byteLength,
  };
}

export function triggerBrowserDownload(
  buffer: ArrayBuffer,
  fileName: string
): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
