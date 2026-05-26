import { computePricingSummary } from "@/src/lib/pricing/summary";
import { formatPricingSourceLabel } from "@/src/lib/pricing/pricing-source";
import type { OrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  Document,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
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
  pricingSchedule: TenderPackPricingRow[];
  materials: TenderPackMaterialRow[];
  labour: TenderPackLabourRow[];
  exclusions: TenderPackClarificationRow[];
  assumptions: TenderPackClarificationRow[];
  rfisAndClarifications: TenderPackClarificationRow[];
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
    },
    commercial: {
      totalCost: pricingSummary.totalCost,
      totalSell: pricingSummary.totalSell,
      grossProfit: pricingSummary.grossProfit,
      marginPercent: pricingSummary.averageMarginPercent,
      pricingCoveragePercent: percent(pricedCount, priceableTakeoff.length),
      packageCoveragePercent: percent(packageApplied, priceableTakeoff.length),
    },
    pricingSchedule,
    materials,
    labour,
    exclusions,
    assumptions,
    rfisAndClarifications,
    documents: documents.map((doc) => ({
      fileName: doc.file_name,
      documentType: doc.document_type,
      status: doc.processing_status,
    })),
    readiness: buildReadinessSection(validation, packContents.items),
  };
}
