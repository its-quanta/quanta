import { formatPricingSourceLabel } from "@/src/lib/pricing/pricing-source";
import type { ScopeGap } from "@/src/lib/scope-gaps/types";
import type {
  AssemblyPackage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

export type TakeoffRelationshipMaterialLine = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  totalCost: number;
};

export type TakeoffRelationshipLabourLine = {
  id: string;
  name: string;
  hours: number;
  totalCost: number;
  totalSell: number;
};

export type TakeoffRelationshipStandard = {
  id: string;
  linkId: string;
  referenceCode: string;
  name: string;
};

export type TakeoffRelationshipClarification = {
  id: string;
  type: TenderClarification["type"];
  title: string;
  status: string;
  priority: string | null;
};

export type TakeoffItemRelationshipsView = {
  takeoffItemId: string;
  itemName: string;
  trade: string;
  quantity: number;
  unit: string;
  status: TakeoffItem["status"];
  reviewed: boolean;
  badges: {
    packageApplied: boolean;
    reviewed: boolean;
    pricingComplete: boolean;
    ready: boolean;
  };
  methodology: {
    packageId: string;
    packageName: string;
    trade: string | null;
    unit: string;
    marginPercent: number | null;
    markupPercent: number | null;
  } | null;
  pricing: {
    pricingItemId: string;
    totalCost: number;
    totalSell: number;
    marginPercent: number | null;
    pricingSourceLabel: string;
    isPackage: boolean;
  } | null;
  materials: {
    lines: TakeoffRelationshipMaterialLine[];
    totalCost: number;
  };
  labour: {
    lines: TakeoffRelationshipLabourLine[];
    totalCost: number;
    totalSell: number;
  };
  standards: TakeoffRelationshipStandard[];
  clarifications: {
    rfis: TakeoffRelationshipClarification[];
    exclusions: TakeoffRelationshipClarification[];
    assumptions: TakeoffRelationshipClarification[];
  };
  documents: {
    sourceDocumentId: string | null;
    sourceDocumentName: string | null;
    drawingReference: string | null;
    pageNumber: number | null;
    sheetNumber: string | null;
  };
  submission: {
    includedInTender: boolean;
    readinessStatus: "Ready" | "In progress" | "Needs attention" | "Excluded";
    blockers: string[];
  };
};

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function getScopeGapsForTakeoffItem(
  gaps: ScopeGap[],
  takeoffItemId: string
): ScopeGap[] {
  return gaps.filter((gap) => gap.takeoff_item_id === takeoffItemId);
}

export function buildTakeoffItemRelationships(input: {
  takeoffItem: TakeoffItem;
  takeoffAssembly: TakeoffItemAssemblyWithPackage | null;
  assemblyPackage: AssemblyPackage | null;
  pricingItem: PricingItem | null;
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  standardLinks: StandardLinkWithStandard[];
  clarifications: TenderClarification[];
  scopeGaps: ScopeGap[];
  sourceDocumentName: string | null;
}): TakeoffItemRelationshipsView {
  const { takeoffItem } = input;
  const itemGaps = getScopeGapsForTakeoffItem(
    input.scopeGaps,
    takeoffItem.id
  );

  const materials = input.materialItems
    .filter((row) => row.takeoff_item_id === takeoffItem.id)
    .map((row) => ({
      id: row.id,
      name: row.material_name,
      quantity: row.quantity,
      unit: row.unit,
      totalCost: row.total_cost,
    }));

  const labour = input.labourItems
    .filter((row) => row.takeoff_item_id === takeoffItem.id)
    .map((row) => ({
      id: row.id,
      name: row.labour_name,
      hours: row.hours,
      totalCost: row.total_cost,
      totalSell: row.total_sell,
    }));

  const relatedClarifications = input.clarifications.filter(
    (row) => row.related_takeoff_item_id === takeoffItem.id
  );

  const mapClarification = (
    row: TenderClarification
  ): TakeoffRelationshipClarification => ({
    id: row.id,
    type: row.type,
    title: row.title,
    status: row.status,
    priority: row.priority,
  });

  const standards = input.standardLinks
    .filter(
      (link) =>
        link.entity_type === "takeoff_item" && link.entity_id === takeoffItem.id
    )
    .map((link) => ({
      id: link.standard.id,
      linkId: link.id,
      referenceCode: link.standard.reference_code,
      name: link.standard.name,
    }));

  const pricingComplete = input.pricingItem !== null;
  const packageApplied = input.takeoffAssembly !== null;
  const includedInTender = takeoffItem.status !== "excluded";
  const blockers = itemGaps.map((gap) => gap.label);

  let readinessStatus: TakeoffItemRelationshipsView["submission"]["readinessStatus"] =
    "In progress";

  if (!includedInTender) {
    readinessStatus = "Excluded";
  } else if (blockers.length > 0) {
    readinessStatus = "Needs attention";
  } else if (takeoffItem.reviewed && pricingComplete) {
    readinessStatus = "Ready";
  }

  const ready =
    includedInTender &&
    blockers.length === 0 &&
    takeoffItem.reviewed &&
    pricingComplete;

  const pkg = input.assemblyPackage;

  return {
    takeoffItemId: takeoffItem.id,
    itemName: takeoffItem.item_name,
    trade: takeoffItem.trade,
    quantity: takeoffItem.quantity,
    unit: takeoffItem.unit,
    status: takeoffItem.status,
    reviewed: takeoffItem.reviewed,
    badges: {
      packageApplied,
      reviewed: takeoffItem.reviewed,
      pricingComplete,
      ready,
    },
    methodology:
      input.takeoffAssembly && pkg
        ? {
            packageId: pkg.id,
            packageName: pkg.name,
            trade: pkg.trade,
            unit: input.takeoffAssembly.unit,
            marginPercent: pkg.default_margin_percentage,
            markupPercent: pkg.default_markup_percentage,
          }
        : input.takeoffAssembly
          ? {
              packageId: input.takeoffAssembly.assembly_package_id,
              packageName: input.takeoffAssembly.assembly_package.name,
              trade: null,
              unit: input.takeoffAssembly.unit,
              marginPercent: null,
              markupPercent: null,
            }
          : null,
    pricing: input.pricingItem
      ? {
          pricingItemId: input.pricingItem.id,
          totalCost: input.pricingItem.total_cost,
          totalSell: input.pricingItem.total_sell,
          marginPercent: input.pricingItem.margin_percentage,
          pricingSourceLabel: formatPricingSourceLabel(
            input.pricingItem.pricing_method,
            input.takeoffAssembly ?? undefined
          ),
          isPackage: input.pricingItem.pricing_method === "package",
        }
      : null,
    materials: {
      lines: materials,
      totalCost: sum(materials.map((line) => line.totalCost)),
    },
    labour: {
      lines: labour,
      totalCost: sum(labour.map((line) => line.totalCost)),
      totalSell: sum(labour.map((line) => line.totalSell)),
    },
    standards,
    clarifications: {
      rfis: relatedClarifications
        .filter((row) => row.type === "rfi")
        .map(mapClarification),
      exclusions: relatedClarifications
        .filter((row) => row.type === "exclusion")
        .map(mapClarification),
      assumptions: relatedClarifications
        .filter((row) => row.type === "assumption")
        .map(mapClarification),
    },
    documents: {
      sourceDocumentId: takeoffItem.source_document_id,
      sourceDocumentName: input.sourceDocumentName,
      drawingReference: takeoffItem.drawing_reference?.trim() || null,
      pageNumber: takeoffItem.page_number,
      sheetNumber: takeoffItem.sheet_number?.trim() || null,
    },
    submission: {
      includedInTender,
      readinessStatus,
      blockers,
    },
  };
}
