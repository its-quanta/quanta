import { SCOPE_GAP_LABELS } from "@/src/lib/scope-gaps/constants";
import type { ScopeGapKind } from "@/src/lib/scope-gaps/types";
import { formatPricingSourceShort } from "@/src/lib/pricing/pricing-source";
import type {
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLink,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type ScopeReviewRow = {
  takeoffItemId: string;
  itemName: string;
  trade: string;
  packageName: string | null;
  pricingStatus: "Priced" | "Unpriced";
  materialsGenerated: boolean;
  labourGenerated: boolean;
  standardsLinked: boolean;
  drawingRef: string | null;
  issues: string[];
  pricingMethod?: string;
};

function getDrawingRefLabel(item: TakeoffItem): string | null {
  if (item.drawing_reference?.trim()) {
    return item.drawing_reference.trim();
  }
  if (item.sheet_number?.trim()) {
    return item.sheet_number.trim();
  }
  if (item.document_page_id) {
    return "Linked page";
  }
  return null;
}

export function buildScopeReviewRows(input: {
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  standardLinks: StandardLink[];
}): ScopeReviewRow[] {
  const {
    takeoffItems,
    takeoffAssemblies,
    pricingItems,
    materialItems,
    labourItems,
    standardLinks,
  } = input;

  const assemblyByTakeoff = new Map(
    takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
  );
  const pricingByTakeoff = new Map(
    pricingItems.map((row) => [row.takeoff_item_id, row] as const)
  );
  const materialCount = new Map<string, number>();
  const labourCount = new Map<string, number>();

  for (const row of materialItems) {
    materialCount.set(
      row.takeoff_item_id,
      (materialCount.get(row.takeoff_item_id) ?? 0) + 1
    );
  }

  for (const row of labourItems) {
    labourCount.set(
      row.takeoff_item_id,
      (labourCount.get(row.takeoff_item_id) ?? 0) + 1
    );
  }

  const standardsByTakeoff = new Set(
    standardLinks
      .filter((link) => link.entity_type === "takeoff_item")
      .map((link) => link.entity_id)
  );

  return takeoffItems
    .filter((item) => item.status !== "excluded")
    .map((item) => {
      const assembly = assemblyByTakeoff.get(item.id);
      const pricing = pricingByTakeoff.get(item.id);
      const hasMaterials = (materialCount.get(item.id) ?? 0) > 0;
      const hasLabour = (labourCount.get(item.id) ?? 0) > 0;
      const hasStandards = standardsByTakeoff.has(item.id);
      const drawingRef = getDrawingRefLabel(item);

      const issues: string[] = [];

      if (!assembly) {
        issues.push(SCOPE_GAP_LABELS.missing_package);
      }
      if (!pricing) {
        issues.push(SCOPE_GAP_LABELS.missing_pricing);
      }
      if (assembly && !hasMaterials) {
        issues.push(SCOPE_GAP_LABELS.missing_material_generation);
      }
      if (assembly && !hasLabour) {
        issues.push(SCOPE_GAP_LABELS.missing_labour_generation);
      }
      if (!drawingRef) {
        issues.push(SCOPE_GAP_LABELS.missing_drawing_reference);
      }
      if (!hasStandards) {
        issues.push(SCOPE_GAP_LABELS.missing_standards_reference);
      }

      return {
        takeoffItemId: item.id,
        itemName: item.item_name,
        trade: item.trade,
        packageName: assembly?.assembly_package.name ?? null,
        pricingStatus: pricing ? "Priced" : "Unpriced",
        materialsGenerated: hasMaterials,
        labourGenerated: hasLabour,
        standardsLinked: hasStandards,
        drawingRef,
        issues,
        pricingMethod: pricing
          ? formatPricingSourceShort(pricing.pricing_method, assembly)
          : undefined,
      };
    });
}

export type ScopeReviewSummary = {
  packageCoveragePercent: number | null;
  pricingCoveragePercent: number | null;
  missingPricing: number;
  missingMethodology: number;
  missingLabour: number;
  missingMaterials: number;
  missingDrawingRef: number;
  missingStandards: number;
};

export function computeScopeReviewSummary(
  rows: ScopeReviewRow[]
): ScopeReviewSummary {
  const total = rows.length;

  const missingPricing = rows.filter((r) => r.pricingStatus === "Unpriced").length;
  const missingMethodology = rows.filter((r) => !r.packageName).length;
  const missingLabour = rows.filter(
    (r) => r.packageName && !r.labourGenerated
  ).length;
  const missingMaterials = rows.filter(
    (r) => r.packageName && !r.materialsGenerated
  ).length;
  const missingDrawingRef = rows.filter((r) => !r.drawingRef).length;
  const missingStandards = rows.filter((r) => !r.standardsLinked).length;

  const priced = total - missingPricing;
  const withPackage = total - missingMethodology;

  return {
    packageCoveragePercent:
      total === 0 ? null : Math.round((withPackage / total) * 1000) / 10,
    pricingCoveragePercent:
      total === 0 ? null : Math.round((priced / total) * 1000) / 10,
    missingPricing,
    missingMethodology,
    missingLabour,
    missingMaterials,
    missingDrawingRef,
    missingStandards,
  };
}

export function scopeReviewRowsWithIssue(
  rows: ScopeReviewRow[],
  kind: ScopeGapKind | "all"
): ScopeReviewRow[] {
  if (kind === "all") {
    return rows.filter((row) => row.issues.length > 0);
  }

  const label = SCOPE_GAP_LABELS[kind];
  return rows.filter((row) => row.issues.includes(label));
}
