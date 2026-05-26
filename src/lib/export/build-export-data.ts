import { DOCUMENT_CLASSIFICATION_LABELS } from "@/src/lib/documents/constants";
import { PROCESSING_STATUS_LABELS } from "@/src/lib/documents/constants";
import { computeCommercialMetrics } from "@/src/lib/projects/commercial-metrics";
import { computeAverageMarginPercent } from "@/src/lib/pricing/calculations";
import { formatPricingSourceLabel } from "@/src/lib/pricing/pricing-source";
import { buildExportFileName } from "@/src/lib/export/filename";
import type {
  BuiltExport,
  ExportProjectData,
  ExportSheetDefinition,
  ExportType,
} from "@/src/lib/export/types";
import type { DocumentClassification, TenderClarification } from "@/src/types/database";

function clarificationTypeLabel(type: TenderClarification["type"]): string {
  switch (type) {
    case "exclusion":
      return "Exclusion";
    case "assumption":
      return "Assumption";
    case "rfi":
      return "RFI";
    case "clarification":
      return "Clarification";
    default:
      return type;
  }
}

function lineMarginPercent(
  totalSell: number,
  grossProfit: number,
  storedMargin: number | null
): number | null {
  if (storedMargin !== null && storedMargin !== undefined) {
    return storedMargin;
  }
  return computeAverageMarginPercent(totalSell, grossProfit);
}

export function buildPricingScheduleSheet(
  data: ExportProjectData
): ExportSheetDefinition {
  const assemblyByTakeoff = new Map(
    data.takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
  );
  const takeoffById = new Map(data.takeoffItems.map((item) => [item.id, item] as const));

  const headers = [
    "Trade",
    "Takeoff Item",
    "Quantity",
    "Unit",
    "Pricing Source",
    "Cost Rate",
    "Sell Rate",
    "Cost Total",
    "Sell Total",
    "Margin %",
    "Package Applied",
    "Drawing Ref",
    "Sheet Number",
  ];

  const rows = [...data.pricingItems]
    .sort((a, b) => {
      const trade = a.takeoff_item.trade.localeCompare(b.takeoff_item.trade);
      if (trade !== 0) {
        return trade;
      }
      return a.takeoff_item.item_name.localeCompare(b.takeoff_item.item_name);
    })
    .map((item) => {
      const assembly = assemblyByTakeoff.get(item.takeoff_item_id);
      const takeoff = takeoffById.get(item.takeoff_item_id);
      const margin = lineMarginPercent(
        item.total_sell,
        item.gross_profit,
        item.margin_percentage
      );

      return [
        item.takeoff_item.trade,
        item.takeoff_item.item_name,
        item.quantity,
        item.unit,
        formatPricingSourceLabel(item.pricing_method, assembly),
        item.cost_rate,
        item.sell_rate,
        item.total_cost,
        item.total_sell,
        margin !== null ? margin / 100 : null,
        assembly?.assembly_package.name ?? "—",
        takeoff?.drawing_reference ?? "—",
        takeoff?.sheet_number ?? "—",
      ];
    });

  return {
    sheetName: "Pricing",
    headers,
    rows,
    currencyColumnIndexes: [5, 6, 7, 8],
    percentColumnIndexes: [9],
    marginPercentColumnIndex: 9,
  };
}

export function buildMaterialsScheduleSheet(
  data: ExportProjectData
): ExportSheetDefinition {
  const headers = [
    "Material",
    "Quantity",
    "Unit",
    "Supplier",
    "Cost Rate",
    "Total Cost",
    "Package Source",
    "Reviewed",
  ];

  const rows = [...data.materialItems]
    .sort((a, b) => a.material_name.localeCompare(b.material_name))
    .map((row) => [
      row.material_name,
      row.quantity,
      row.unit,
      row.supplier ?? "—",
      row.cost_rate,
      row.total_cost,
      row.source_package_name,
      row.reviewed ? "Yes" : "No",
    ]);

  return {
    sheetName: "Materials",
    headers,
    rows,
    currencyColumnIndexes: [4, 5],
  };
}

export function buildLabourScheduleSheet(
  data: ExportProjectData
): ExportSheetDefinition {
  const headers = [
    "Role",
    "Hours",
    "Cost Rate",
    "Charge Rate",
    "Total Cost",
    "Total Sell",
    "Package Source",
    "Reviewed",
  ];

  const rows = [...data.labourItems]
    .sort((a, b) => a.labour_name.localeCompare(b.labour_name))
    .map((row) => [
      row.labour_name,
      row.hours,
      row.cost_rate,
      row.charge_rate,
      row.total_cost,
      row.total_sell,
      row.source_package_name,
      row.reviewed ? "Yes" : "No",
    ]);

  return {
    sheetName: "Labour",
    headers,
    rows,
    currencyColumnIndexes: [2, 3, 4, 5],
  };
}

export function buildCommercialSummarySheets(
  data: ExportProjectData
): ExportSheetDefinition[] {
  const metrics = computeCommercialMetrics({
    project: data.project,
    organisationSettings: data.organisationSettings,
    pricingItems: data.pricingItems,
    takeoffItems: data.takeoffItems,
    takeoffAssemblies: data.takeoffAssemblies,
    materialItems: data.materialItems,
    labourItems: data.labourItems,
    scopeGapsTotal: data.scopeGapsTotal,
    exclusionsDraftedPercent: data.exclusionsDraftedPercent,
  });

  const priceableTakeoff = data.takeoffItems.filter(
    (item) => item.status !== "excluded"
  );
  const pricingCoveragePercent =
    priceableTakeoff.length > 0
      ? Math.round(
          (data.pricingItems.length / priceableTakeoff.length) * 1000
        ) / 10
      : null;

  const summarySheet: ExportSheetDefinition = {
    sheetName: "Commercial",
    headers: ["Metric", "Value"],
    rows: [
      ["Tender value", metrics.tenderValue ?? 0],
      ["Total cost", metrics.totalCost],
      ["Gross profit", metrics.grossProfit],
      [
        "Margin %",
        metrics.marginPercent !== null ? metrics.marginPercent / 100 : null,
      ],
      [
        "Material %",
        metrics.materialPercent !== null ? metrics.materialPercent / 100 : null,
      ],
      [
        "Labour %",
        metrics.labourPercent !== null ? metrics.labourPercent / 100 : null,
      ],
      [
        "Pricing coverage %",
        pricingCoveragePercent !== null ? pricingCoveragePercent / 100 : null,
      ],
      [
        "Package coverage %",
        metrics.packageCoveragePercent !== null
          ? metrics.packageCoveragePercent / 100
          : null,
      ],
      ["Risk score", metrics.riskScore],
      ...metrics.riskFlags.map((flag) => [
        flag.severity === "blocker" ? "Risk (blocker)" : "Risk (review)",
        flag.label,
      ]),
    ],
    currencyColumnIndexes: [1],
    percentColumnIndexes: [1],
    riskFlagRowIndexes: metrics.riskFlags.map(
      (_, index) => 9 + index
    ),
  };

  const tradeSheet: ExportSheetDefinition = {
    sheetName: "Trade Breakdown",
    headers: [
      "Trade",
      "Takeoff items",
      "Cost",
      "Sell",
      "Gross profit",
      "Margin %",
      "Package coverage %",
      "Pricing coverage %",
      "Risk",
    ],
    rows: metrics.tradeRows.map((row) => [
      row.trade,
      row.takeoffItems,
      row.cost,
      row.sell,
      row.grossProfit,
      row.marginPercent !== null ? row.marginPercent / 100 : null,
      row.packageCoveragePercent !== null
        ? row.packageCoveragePercent / 100
        : null,
      row.pricingCoveragePercent !== null
        ? row.pricingCoveragePercent / 100
        : null,
      row.risk,
    ]),
    currencyColumnIndexes: [2, 3, 4],
    percentColumnIndexes: [5, 6, 7],
    marginPercentColumnIndex: 5,
  };

  return [summarySheet, tradeSheet];
}

export function buildClarificationsSheet(
  data: ExportProjectData
): ExportSheetDefinition {
  const headers = [
    "Type",
    "Title",
    "Description",
    "Status",
    "Priority",
    "Related drawing",
  ];

  const rows = [...data.clarifications]
    .sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title))
    .map((row) => [
      clarificationTypeLabel(row.type),
      row.title,
      row.description ?? "—",
      row.status.replace(/_/g, " "),
      row.priority ?? "—",
      row.related_drawing ?? "—",
    ]);

  return {
    sheetName: "Clarifications",
    headers,
    rows,
  };
}

export function buildDocumentsSheet(
  data: ExportProjectData
): ExportSheetDefinition {
  const headers = ["File name", "Document type", "Status"];

  const rows = [...data.documents]
    .sort((a, b) => a.file_name.localeCompare(b.file_name))
    .map((doc) => [
      doc.file_name,
      DOCUMENT_CLASSIFICATION_LABELS[doc.document_type as DocumentClassification] ??
        doc.document_type,
      PROCESSING_STATUS_LABELS[doc.processing_status],
    ]);

  return {
    sheetName: "Documents",
    headers,
    rows,
  };
}

export function buildSummarySheet(data: ExportProjectData): ExportSheetDefinition {
  const metrics = computeCommercialMetrics({
    project: data.project,
    organisationSettings: data.organisationSettings,
    pricingItems: data.pricingItems,
    takeoffItems: data.takeoffItems,
    takeoffAssemblies: data.takeoffAssemblies,
    materialItems: data.materialItems,
    labourItems: data.labourItems,
    scopeGapsTotal: data.scopeGapsTotal,
    exclusionsDraftedPercent: data.exclusionsDraftedPercent,
  });

  return {
    sheetName: "Summary",
    headers: ["Field", "Value"],
    rows: [
      ["Project", data.project.name],
      ["Client", data.project.client_name ?? "—"],
      ["Trade scope", data.project.trade_scope ?? "—"],
      ["Tender due", data.project.tender_due_date ?? "—"],
      ["Prepared by", data.organisationSettings.name],
      ["Tender value", metrics.tenderValue ?? 0],
      ["Total sell", metrics.totalCost + metrics.grossProfit],
      ["Total cost", metrics.totalCost],
      ["Gross profit", metrics.grossProfit],
      [
        "Margin %",
        metrics.marginPercent !== null ? metrics.marginPercent / 100 : null,
      ],
      ["Pricing lines", data.pricingItems.length],
      ["Material lines", data.materialItems.length],
      ["Labour lines", data.labourItems.length],
      ["Clarifications", data.clarifications.length],
      ["Documents", data.documents.length],
    ],
    currencyColumnIndexes: [1],
    percentColumnIndexes: [1],
  };
}

export function buildExport(
  exportType: ExportType,
  data: ExportProjectData
): BuiltExport {
  const fileName = buildExportFileName(data.project.name, exportType);

  let sheets: ExportSheetDefinition[] = [];

  switch (exportType) {
    case "pricing":
      sheets = [buildPricingScheduleSheet(data)];
      break;
    case "materials":
      sheets = [buildMaterialsScheduleSheet(data)];
      break;
    case "labour":
      sheets = [buildLabourScheduleSheet(data)];
      break;
    case "commercial":
      sheets = buildCommercialSummarySheets(data);
      break;
    case "clarifications":
      sheets = [buildClarificationsSheet(data)];
      break;
    case "full-pack":
      sheets = [
        buildSummarySheet(data),
        buildPricingScheduleSheet(data),
        buildMaterialsScheduleSheet(data),
        buildLabourScheduleSheet(data),
        ...buildCommercialSummarySheets(data),
        buildClarificationsSheet(data),
        buildDocumentsSheet(data),
      ];
      break;
  }

  const rowCount = sheets.reduce(
    (sum, sheet) => sum + sheet.rows.length,
    0
  );

  return { fileName, rowCount, sheets };
}
