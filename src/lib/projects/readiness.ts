import type {
  Document,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLink,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type ProjectReadinessMetrics = {
  documentsUploaded: number;
  takeoffItemsTotal: number;
  priceableTakeoffItems: number;
  takeoffCoveragePercent: number | null;
  packageCoveragePercent: number | null;
  pricingCoveragePercent: number | null;
  materialGenerationPercent: number | null;
  labourGenerationPercent: number | null;
  standardsCoveragePercent: number | null;
  exclusionsDraftedPercent: number | null;
  readyForSubmission: boolean;
  unpricedItems: number;
  pricedItems: number;
  packageAppliedItems: number;
};

function percent(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function computeProjectReadiness(input: {
  documents: Document[];
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  standardLinks: StandardLink[];
  scopeGapsTotal: number;
}): ProjectReadinessMetrics {
  const {
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    materialItems,
    labourItems,
    standardLinks,
    scopeGapsTotal,
  } = input;

  const priceableTakeoff = takeoffItems.filter(
    (item) => item.status !== "excluded"
  );
  const priceableCount = priceableTakeoff.length;

  const pricedTakeoffIds = new Set(
    pricingItems.map((item) => item.takeoff_item_id)
  );
  const pricedItems = priceableTakeoff.filter((item) =>
    pricedTakeoffIds.has(item.id)
  ).length;

  const assemblyByTakeoff = new Set(
    takeoffAssemblies.map((row) => row.takeoff_item_id)
  );
  const packageAppliedItems = priceableTakeoff.filter((item) =>
    assemblyByTakeoff.has(item.id)
  ).length;

  const takeoffMeasured = priceableTakeoff.filter(
    (item) => item.quantity > 0 && item.item_name.trim().length > 0
  ).length;

  const materialByTakeoff = new Set(
    materialItems.map((row) => row.takeoff_item_id)
  );
  const labourByTakeoff = new Set(
    labourItems.map((row) => row.takeoff_item_id)
  );
  const standardsByTakeoff = new Set(
    standardLinks
      .filter((link) => link.entity_type === "takeoff_item")
      .map((link) => link.entity_id)
  );

  const withPackage = priceableTakeoff.filter((item) =>
    assemblyByTakeoff.has(item.id)
  );

  const materialGenerated = withPackage.filter((item) =>
    materialByTakeoff.has(item.id)
  ).length;

  const labourGenerated = withPackage.filter((item) =>
    labourByTakeoff.has(item.id)
  ).length;

  const standardsLinked = priceableTakeoff.filter((item) =>
    standardsByTakeoff.has(item.id)
  ).length;

  const pricingCoveragePercent = percent(pricedItems, priceableCount);
  const packageCoveragePercent = percent(packageAppliedItems, priceableCount);
  const takeoffCoveragePercent = percent(takeoffMeasured, priceableCount);
  const materialGenerationPercent = percent(
    materialGenerated,
    withPackage.length
  );
  const labourGenerationPercent = percent(labourGenerated, withPackage.length);
  const standardsCoveragePercent = percent(standardsLinked, priceableCount);

  const readyForSubmission =
    priceableCount > 0 &&
    scopeGapsTotal === 0 &&
    pricedItems === priceableCount;

  return {
    documentsUploaded: documents.length,
    takeoffItemsTotal: takeoffItems.length,
    priceableTakeoffItems: priceableCount,
    takeoffCoveragePercent,
    packageCoveragePercent,
    pricingCoveragePercent,
    materialGenerationPercent,
    labourGenerationPercent,
    standardsCoveragePercent,
    exclusionsDraftedPercent: null,
    readyForSubmission,
    unpricedItems: Math.max(0, priceableCount - pricedItems),
    pricedItems,
    packageAppliedItems,
  };
}

/** @deprecated Use computeProjectReadiness — kept for gradual migration */
export type ProjectReadinessCounts = Pick<
  ProjectReadinessMetrics,
  | "documentsUploaded"
  | "unpricedItems"
  | "pricedItems"
  | "packageAppliedItems"
> & {
  takeoffItems: number;
};

export function computeProjectReadinessLegacy(
  documents: Document[],
  takeoffItems: TakeoffItem[],
  pricingItems: PricingItem[],
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[]
): ProjectReadinessCounts {
  const metrics = computeProjectReadiness({
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    materialItems: [],
    labourItems: [],
    standardLinks: [],
    scopeGapsTotal: 0,
  });

  return {
    documentsUploaded: metrics.documentsUploaded,
    takeoffItems: metrics.takeoffItemsTotal,
    pricedItems: metrics.pricedItems,
    packageAppliedItems: metrics.packageAppliedItems,
    unpricedItems: metrics.unpricedItems,
  };
}
