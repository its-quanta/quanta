import { computePricingSummary } from "@/src/lib/pricing/summary";
import { formatPricingSourceLabel } from "@/src/lib/pricing/pricing-source";
import type { OrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import { computeAverageMarginPercent } from "@/src/lib/pricing/calculations";
import type {
  Document,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

import type { SubmissionPreviewData, TenderPackItem } from "./preview";
import type { TenderValidationResult } from "./types";

export type TenderPackCoverSummary = {
  projectName: string;
  clientName: string | null;
  projectType: string | null;
  tradeScope: string | null;
  tenderDueDate: string | null;
  tenderValue: number | null;
  organisationName: string;
  generatedAt: string;
  issueDate: string;
  revision: string;
};

export type TenderPackTradeSummaryRow = {
  trade: string;
  lineCount: number;
  totalSell: number;
  marginPercent: number | null;
};

export type TenderPackMethodologyRow = {
  packageName: string;
  trade: string | null;
  unit: string;
  usageCount: number;
};

export type TenderPackStandardRow = {
  referenceCode: string;
  name: string;
  standardType: string;
};

export type TenderPackCommercialSummary = {
  totalCost: number;
  totalSell: number;
  grossProfit: number;
  marginPercent: number | null;
  pricingCoveragePercent: number | null;
  packageCoveragePercent: number | null;
};

export type TenderPackPricingRow = {
  takeoffItemName: string;
  trade: string;
  quantity: number;
  unit: string;
  pricingSource: string;
  costRate: number;
  sellRate: number;
  totalSell: number;
  notes: string | null;
};

export type TenderPackMaterialRow = {
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string | null;
  totalCost: number;
  packageSource: string;
};

export type TenderPackLabourRow = {
  labourRole: string;
  hours: number;
  costRate: number;
  chargeRate: number;
  totalCost: number;
  totalSell: number;
  packageSource: string;
};

export type TenderPackClarificationRow = {
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  relatedDrawing: string | null;
};

export type TenderPackDocumentRow = {
  fileName: string;
  documentType: string;
  status: string;
};

export type TenderPackReadinessSection = {
  criticalIssues: { title: string; description: string }[];
  warnings: { title: string; description: string }[];
  missingItems: { label: string; detail: string }[];
};

export type TenderPackPreviewData = {
  cover: TenderPackCoverSummary;
  commercial: TenderPackCommercialSummary;
  tradeSummaries: TenderPackTradeSummaryRow[];
  pricingSchedule: TenderPackPricingRow[];
  materials: TenderPackMaterialRow[];
  labour: TenderPackLabourRow[];
  exclusions: TenderPackClarificationRow[];
  assumptions: TenderPackClarificationRow[];
  rfisAndClarifications: TenderPackClarificationRow[];
  methodologies: TenderPackMethodologyRow[];
  standards: TenderPackStandardRow[];
  documents: TenderPackDocumentRow[];
  readiness: TenderPackReadinessSection | null;
};

function percent(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

function mapClarification(row: TenderClarification): TenderPackClarificationRow {
  return {
    title: row.title,
    description: row.description,
    status: row.status.replace(/_/g, " "),
    priority: row.priority,
    relatedDrawing: row.related_drawing,
  };
}

function buildReadinessSection(
  validation: TenderValidationResult,
  packItems: TenderPackItem[]
): TenderPackReadinessSection | null {
  if (validation.readinessStatus === "ready") {
    const missing = packItems.filter((item) => item.status === "missing");
    if (missing.length === 0) {
      return null;
    }
    return {
      criticalIssues: [],
      warnings: [],
      missingItems: missing.map((item) => ({
        label: item.label,
        detail: item.detail,
      })),
    };
  }

  return {
    criticalIssues: validation.issues
      .filter((issue) => issue.severity === "critical")
      .map((issue) => ({
        title: issue.title,
        description: issue.description,
      })),
    warnings: validation.issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => ({
        title: issue.title,
        description: issue.description,
      })),
    missingItems: packItems
      .filter((item) => item.status === "missing")
      .map((item) => ({
        label: item.label,
        detail: item.detail,
      })),
  };
}

function buildTradeSummaries(
  pricingItems: PricingItemWithTakeoff[]
): TenderPackTradeSummaryRow[] {
  const byTrade = new Map<
    string,
    { sell: number; cost: number; count: number }
  >();

  for (const item of pricingItems) {
    const trade = item.takeoff_item.trade;
    const existing = byTrade.get(trade) ?? { sell: 0, cost: 0, count: 0 };
    existing.sell += item.total_sell;
    existing.cost += item.total_cost;
    existing.count += 1;
    byTrade.set(trade, existing);
  }

  return [...byTrade.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([trade, stats]) => ({
      trade,
      lineCount: stats.count,
      totalSell: stats.sell,
      marginPercent: computeAverageMarginPercent(
        stats.sell,
        stats.sell - stats.cost
      ),
    }));
}

function buildMethodologies(
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[]
): TenderPackMethodologyRow[] {
  const byPackage = new Map<string, TenderPackMethodologyRow>();

  for (const row of takeoffAssemblies) {
    const key = row.assembly_package_id;
    const existing = byPackage.get(key);
    if (existing) {
      existing.usageCount += 1;
    } else {
      byPackage.set(key, {
        packageName: row.assembly_package.name,
        trade: null,
        unit: row.assembly_package.unit,
        usageCount: 1,
      });
    }
  }

  return [...byPackage.values()].sort((a, b) =>
    a.packageName.localeCompare(b.packageName)
  );
}

function buildStandards(
  standardLinks: StandardLinkWithStandard[]
): TenderPackStandardRow[] {
  const seen = new Set<string>();
  const rows: TenderPackStandardRow[] = [];

  for (const link of standardLinks) {
    if (seen.has(link.standard_id)) {
      continue;
    }
    seen.add(link.standard_id);
    rows.push({
      referenceCode: link.standard.reference_code,
      name: link.standard.name,
      standardType: link.standard.standard_type.replace(/_/g, " "),
    });
  }

  return rows.sort((a, b) => a.referenceCode.localeCompare(b.referenceCode));
}

function formatRevisionLabel(project: Project, generatedAt: string): string {
  const date = generatedAt.slice(0, 10);
  if (project.status) {
    return `${project.status.replace(/_/g, " ")} · ${date}`;
  }
  return date;
}

export function buildTenderPackPreview(input: {
  project: Project;
  organisationSettings: OrganisationSettingsSnapshot;
  documents: Document[];
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItemWithTakeoff[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  clarifications: TenderClarification[];
  standardLinks?: StandardLinkWithStandard[];
  validation: TenderValidationResult;
  packContents: SubmissionPreviewData;
  generatedAt?: string;
}): TenderPackPreviewData {
  const {
    project,
    organisationSettings,
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    materialItems,
    labourItems,
    clarifications,
    standardLinks = [],
    validation,
    packContents,
    generatedAt = new Date().toISOString(),
  } = input;

  const priceableTakeoff = takeoffItems.filter((item) => item.status !== "excluded");
  const pricingSummary = computePricingSummary(pricingItems, takeoffItems);
  const assemblyByTakeoff = new Map(
    takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
  );

  const pricedCount = pricingItems.length;
  const packageApplied = priceableTakeoff.filter((item) =>
    assemblyByTakeoff.has(item.id)
  ).length;

  const pricingSchedule: TenderPackPricingRow[] = [...pricingItems]
    .sort((a, b) => {
      const tradeCompare = a.takeoff_item.trade.localeCompare(b.takeoff_item.trade);
      if (tradeCompare !== 0) {
        return tradeCompare;
      }
      return a.takeoff_item.item_name.localeCompare(b.takeoff_item.item_name);
    })
    .map((item) => {
      const assembly = assemblyByTakeoff.get(item.takeoff_item_id);
      return {
        takeoffItemName: item.takeoff_item.item_name,
        trade: item.takeoff_item.trade,
        quantity: item.quantity,
        unit: item.unit,
        pricingSource: formatPricingSourceLabel(item.pricing_method, assembly),
        costRate: item.cost_rate,
        sellRate: item.sell_rate,
        totalSell: item.total_sell,
        notes: item.notes,
      };
    });

  const materials: TenderPackMaterialRow[] = [...materialItems]
    .sort((a, b) => a.material_name.localeCompare(b.material_name))
    .map((row) => ({
      materialName: row.material_name,
      quantity: row.quantity,
      unit: row.unit,
      supplier: row.supplier,
      totalCost: row.total_cost,
      packageSource: row.source_package_name,
    }));

  const labour: TenderPackLabourRow[] = [...labourItems]
    .sort((a, b) => a.labour_name.localeCompare(b.labour_name))
    .map((row) => ({
      labourRole: row.labour_name,
      hours: row.hours,
      costRate: row.cost_rate,
      chargeRate: row.charge_rate,
      totalCost: row.total_cost,
      totalSell: row.total_sell,
      packageSource: row.source_package_name,
    }));

  const exclusions = clarifications
    .filter((row) => row.type === "exclusion")
    .map(mapClarification);

  const assumptions = clarifications
    .filter((row) => row.type === "assumption")
    .map(mapClarification);

  const rfisAndClarifications = clarifications
    .filter((row) => row.type === "rfi" || row.type === "clarification")
    .map(mapClarification);

  const tradeSummaries = buildTradeSummaries(pricingItems);
  const methodologies = buildMethodologies(takeoffAssemblies);
  const standards = buildStandards(standardLinks);

  return {
    cover: {
      projectName: project.name,
      clientName: project.client_name,
      projectType: project.project_type,
      tradeScope: project.trade_scope,
      tenderDueDate: project.tender_due_date,
      tenderValue:
        project.estimated_value ??
        (pricingSummary.totalSell > 0 ? pricingSummary.totalSell : null),
      organisationName: organisationSettings.name,
      generatedAt,
      issueDate: generatedAt,
      revision: formatRevisionLabel(project, generatedAt),
    },
    commercial: {
      totalCost: pricingSummary.totalCost,
      totalSell: pricingSummary.totalSell,
      grossProfit: pricingSummary.grossProfit,
      marginPercent: pricingSummary.averageMarginPercent,
      pricingCoveragePercent: percent(pricedCount, priceableTakeoff.length),
      packageCoveragePercent: percent(packageApplied, priceableTakeoff.length),
    },
    tradeSummaries,
    pricingSchedule,
    materials,
    labour,
    exclusions,
    assumptions,
    rfisAndClarifications,
    methodologies,
    standards,
    documents: documents.map((doc) => ({
      fileName: doc.file_name,
      documentType: doc.document_type,
      status: doc.processing_status,
    })),
    readiness: buildReadinessSection(validation, packContents.items),
  };
}
