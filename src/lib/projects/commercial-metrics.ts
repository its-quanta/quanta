import { computeAverageMarginPercent } from "@/src/lib/pricing/calculations";
import { formatPricingSourceShort } from "@/src/lib/pricing/pricing-source";
import {
  computeMaterialsSummary,
  computeLabourSummary,
} from "@/src/lib/estimate-generation/summary";
import { computePricingSummary } from "@/src/lib/pricing/summary";
import { deriveProjectRisk, getTenderRiskLabel } from "@/src/lib/projects/risk";
import type { OrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  PricingMethod,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type TradeCommercialRow = {
  trade: string;
  takeoffItems: number;
  cost: number;
  sell: number;
  grossProfit: number;
  marginPercent: number | null;
  packageCoveragePercent: number | null;
  pricingCoveragePercent: number | null;
  risk: "Low" | "Review" | "High";
};

export type AllocationSegment = {
  label: string;
  value: number;
  percent: number;
};

export type CostComposition = {
  materials: number;
  labour: number;
  subcontractor: number;
  plant: number;
  allowances: number;
  other: number;
  total: number;
};

export type PricingSourceBreakdown = {
  packagePercent: number | null;
  manualPercent: number | null;
  supplierQuotePercent: number | null;
  allowancePercent: number | null;
};

export type PackagePerformanceRow = {
  packageId: string;
  packageName: string;
  quantityUsed: number;
  totalCost: number;
  totalSell: number;
  grossProfit: number;
  marginPercent: number | null;
};

export type CommercialRiskFlag = {
  id: string;
  label: string;
  severity: "review" | "blocker";
};

export type CommercialMetrics = {
  tenderValue: number | null;
  totalCost: number;
  grossProfit: number;
  marginPercent: number | null;
  materialPercent: number | null;
  labourPercent: number | null;
  packageCoveragePercent: number | null;
  manualPricingPercent: number | null;
  supplierExposurePercent: number | null;
  unpricedItems: number;
  riskScore: string;
  costComposition: CostComposition;
  pricingSourceBreakdown: PricingSourceBreakdown;
  labourMaterialSplit: {
    labourCost: number;
    materialCost: number;
    labourPercent: number | null;
    materialPercent: number | null;
  };
  marginByTrade: AllocationSegment[];
  packagePerformance: PackagePerformanceRow[];
  tradeRows: TradeCommercialRow[];
  riskFlags: CommercialRiskFlag[];
};

function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10;
}

function buildAllocationSegments(
  entries: Map<string, number>,
  total: number
): AllocationSegment[] {
  if (total <= 0) {
    return [];
  }

  return [...entries.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);
}

function classifyPricingSource(
  pricingMethod: PricingMethod,
  assembly: TakeoffItemAssemblyWithPackage | undefined
): "package" | "manual" | "supplier_quote" | "allowance" {
  if (pricingMethod === "allowance") {
    return "allowance";
  }
  if (pricingMethod === "subcontractor_quote") {
    return "supplier_quote";
  }
  if (pricingMethod === "package" || assembly) {
    return "package";
  }
  return "manual";
}

function tradeRiskLevel(input: {
  marginPercent: number | null;
  packageCoveragePercent: number | null;
  pricingCoveragePercent: number | null;
  grossProfit: number;
  defaultMargin: number | null;
}): TradeCommercialRow["risk"] {
  if (input.grossProfit < 0) {
    return "High";
  }
  if (
    input.defaultMargin !== null &&
    input.marginPercent !== null &&
    input.marginPercent < input.defaultMargin
  ) {
    return "Review";
  }
  if (
    (input.packageCoveragePercent !== null &&
      input.packageCoveragePercent < 100) ||
    (input.pricingCoveragePercent !== null &&
      input.pricingCoveragePercent < 100)
  ) {
    return "Review";
  }
  return "Low";
}

export function computeCommercialMetrics(input: {
  project: Project;
  organisationSettings: OrganisationSettingsSnapshot;
  pricingItems: PricingItemWithTakeoff[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  scopeGapsTotal: number;
  exclusionsDraftedPercent: number | null;
}): CommercialMetrics {
  const {
    project,
    organisationSettings,
    pricingItems,
    takeoffItems,
    takeoffAssemblies,
    materialItems,
    labourItems,
    scopeGapsTotal,
    exclusionsDraftedPercent,
  } = input;

  const defaultMargin = organisationSettings.default_margin_percentage;

  const pricingSummary = computePricingSummary(pricingItems, takeoffItems);
  const materialsSummary = computeMaterialsSummary(materialItems);
  const labourSummary = computeLabourSummary(labourItems);

  const directCost = pricingSummary.totalCost;
  const materialCost = materialsSummary.totalCost;
  const labourCost = labourSummary.totalCost;

  const assemblyByTakeoff = new Map(
    takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
  );

  let manualCount = 0;
  let packageCount = 0;
  let supplierQuoteCount = 0;
  let allowanceCount = 0;
  let subcontractorSell = 0;

  let subcontractorCost = 0;
  let allowanceCost = 0;

  const marginByTrade = new Map<string, number>();
  const sellByTrade = new Map<string, number>();
  const costByTrade = new Map<string, number>();
  const packageCountByTrade = new Map<string, number>();
  const pricedCountByTrade = new Map<string, number>();
  const takeoffCountByTrade = new Map<string, number>();

  const packagePerformanceMap = new Map<
    string,
    {
      packageName: string;
      quantityUsed: number;
      totalCost: number;
      totalSell: number;
      grossProfit: number;
    }
  >();

  for (const item of pricingItems) {
    const assembly = assemblyByTakeoff.get(item.takeoff_item_id);
    const source = formatPricingSourceShort(item.pricing_method, assembly);
    const sourceClass = classifyPricingSource(item.pricing_method, assembly);

    if (sourceClass === "package") {
      packageCount += 1;
    } else if (sourceClass === "manual") {
      manualCount += 1;
    } else if (sourceClass === "supplier_quote") {
      supplierQuoteCount += 1;
      subcontractorCost += item.total_cost;
    } else if (sourceClass === "allowance") {
      allowanceCount += 1;
      allowanceCost += item.total_cost;
    }

    if (source === "Package" && assembly) {
      const existing = packagePerformanceMap.get(assembly.assembly_package_id);
      if (existing) {
        existing.quantityUsed += item.quantity;
        existing.totalCost += item.total_cost;
        existing.totalSell += item.total_sell;
        existing.grossProfit += item.gross_profit;
      } else {
        packagePerformanceMap.set(assembly.assembly_package_id, {
          packageName: assembly.assembly_package.name,
          quantityUsed: item.quantity,
          totalCost: item.total_cost,
          totalSell: item.total_sell,
          grossProfit: item.gross_profit,
        });
      }
    }

    if (item.pricing_method === "subcontractor_quote") {
      subcontractorSell += item.total_sell;
    }

    const trade = item.takeoff_item.trade;
    marginByTrade.set(
      trade,
      (marginByTrade.get(trade) ?? 0) + item.gross_profit
    );
    sellByTrade.set(trade, (sellByTrade.get(trade) ?? 0) + item.total_sell);
    costByTrade.set(trade, (costByTrade.get(trade) ?? 0) + item.total_cost);
    pricedCountByTrade.set(trade, (pricedCountByTrade.get(trade) ?? 0) + 1);

    if (assembly) {
      packageCountByTrade.set(
        trade,
        (packageCountByTrade.get(trade) ?? 0) + 1
      );
    }
  }

  const priceableTakeoff = takeoffItems.filter((i) => i.status !== "excluded");
  const packageAppliedOnTakeoff = priceableTakeoff.filter((item) =>
    assemblyByTakeoff.has(item.id)
  ).length;

  for (const item of priceableTakeoff) {
    takeoffCountByTrade.set(
      item.trade,
      (takeoffCountByTrade.get(item.trade) ?? 0) + 1
    );
  }

  const pricedTotal = pricingItems.length;

  const compositionTotal = Math.max(
    directCost,
    materialCost + labourCost + subcontractorCost + allowanceCost
  );
  const otherCost = Math.max(
    0,
    compositionTotal -
      materialCost -
      labourCost -
      subcontractorCost -
      allowanceCost
  );

  const costComposition: CostComposition = {
    materials: materialCost,
    labour: labourCost,
    subcontractor: subcontractorCost,
    plant: 0,
    allowances: allowanceCost,
    other: otherCost,
    total: compositionTotal,
  };

  const splitDenominator = materialCost + labourCost;
  const labourMaterialSplit = {
    labourCost,
    materialCost,
    labourPercent: percentOf(labourCost, splitDenominator),
    materialPercent: percentOf(materialCost, splitDenominator),
  };

  const risk = deriveProjectRisk(project, scopeGapsTotal);

  const tradeRows: TradeCommercialRow[] = [...takeoffCountByTrade.entries()]
    .map(([trade, takeoffCount]) => {
      const sell = sellByTrade.get(trade) ?? 0;
      const cost = costByTrade.get(trade) ?? 0;
      const profit = marginByTrade.get(trade) ?? 0;
      const pkgCount = packageCountByTrade.get(trade) ?? 0;
      const pricedCount = pricedCountByTrade.get(trade) ?? 0;
      const marginPercent = computeAverageMarginPercent(sell, profit);
      const packageCoveragePercent = percentOf(pkgCount, takeoffCount);
      const pricingCoveragePercent = percentOf(pricedCount, takeoffCount);

      return {
        trade,
        takeoffItems: takeoffCount,
        cost,
        sell,
        grossProfit: profit,
        marginPercent,
        packageCoveragePercent,
        pricingCoveragePercent,
        risk: tradeRiskLevel({
          marginPercent,
          packageCoveragePercent,
          pricingCoveragePercent,
          grossProfit: profit,
          defaultMargin,
        }),
      };
    })
    .sort((a, b) => b.sell - a.sell);

  const packagePerformance: PackagePerformanceRow[] = [
    ...packagePerformanceMap.entries(),
  ]
    .map(([packageId, row]) => ({
      packageId,
      packageName: row.packageName,
      quantityUsed: row.quantityUsed,
      totalCost: row.totalCost,
      totalSell: row.totalSell,
      grossProfit: row.grossProfit,
      marginPercent: computeAverageMarginPercent(row.totalSell, row.grossProfit),
    }))
    .sort((a, b) => b.totalSell - a.totalSell);

  const takeoffWithoutPackage = priceableTakeoff.filter(
    (item) => !assemblyByTakeoff.has(item.id)
  ).length;
  const takeoffWithoutDrawing = priceableTakeoff.filter(
    (item) => !item.drawing_reference?.trim()
  ).length;

  const riskFlags: CommercialRiskFlag[] = [];

  if (
    defaultMargin !== null &&
    pricingSummary.averageMarginPercent !== null &&
    pricingSummary.averageMarginPercent < defaultMargin
  ) {
    riskFlags.push({
      id: "margin-below-target",
      label: `Margin ${pricingSummary.averageMarginPercent.toFixed(1)}% is below default target ${defaultMargin.toFixed(1)}%.`,
      severity: "review",
    });
  }

  if (pricingSummary.unpricedCount > 0) {
    riskFlags.push({
      id: "missing-pricing",
      label: `${pricingSummary.unpricedCount} takeoff item${pricingSummary.unpricedCount === 1 ? "" : "s"} missing pricing.`,
      severity: "blocker",
    });
  }

  if (takeoffWithoutPackage > 0) {
    riskFlags.push({
      id: "no-package",
      label: `${takeoffWithoutPackage} takeoff item${takeoffWithoutPackage === 1 ? "" : "s"} without an assembly package.`,
      severity: "review",
    });
  }

  if (takeoffWithoutDrawing > 0) {
    riskFlags.push({
      id: "no-drawing-ref",
      label: `${takeoffWithoutDrawing} takeoff item${takeoffWithoutDrawing === 1 ? "" : "s"} without a drawing reference.`,
      severity: "review",
    });
  }

  if (materialsSummary.outstandingReviewCount > 0) {
    riskFlags.push({
      id: "materials-unreviewed",
      label: `${materialsSummary.outstandingReviewCount} material line${materialsSummary.outstandingReviewCount === 1 ? "" : "s"} not reviewed.`,
      severity: "review",
    });
  }

  if (labourSummary.outstandingReviewCount > 0) {
    riskFlags.push({
      id: "labour-unreviewed",
      label: `${labourSummary.outstandingReviewCount} labour line${labourSummary.outstandingReviewCount === 1 ? "" : "s"} not reviewed.`,
      severity: "review",
    });
  }

  if (!exclusionsDraftedPercent || exclusionsDraftedPercent <= 0) {
    riskFlags.push({
      id: "no-exclusions",
      label: "No exclusions drafted for this tender.",
      severity: "review",
    });
  }

  return {
    tenderValue: project.estimated_value ?? pricingSummary.totalSell,
    totalCost: pricingSummary.totalCost,
    grossProfit: pricingSummary.grossProfit,
    marginPercent: pricingSummary.averageMarginPercent,
    materialPercent: percentOf(materialCost, directCost),
    labourPercent: percentOf(labourCost, directCost),
    packageCoveragePercent: percentOf(
      packageAppliedOnTakeoff,
      priceableTakeoff.length
    ),
    manualPricingPercent: percentOf(manualCount, pricedTotal),
    supplierExposurePercent: percentOf(
      subcontractorSell,
      pricingSummary.totalSell
    ),
    unpricedItems: pricingSummary.unpricedCount,
    riskScore: getTenderRiskLabel(risk),
    costComposition,
    pricingSourceBreakdown: {
      packagePercent: percentOf(packageCount, pricedTotal),
      manualPercent: percentOf(manualCount, pricedTotal),
      supplierQuotePercent: percentOf(supplierQuoteCount, pricedTotal),
      allowancePercent: percentOf(allowanceCount, pricedTotal),
    },
    labourMaterialSplit,
    marginByTrade: buildAllocationSegments(
      marginByTrade,
      pricingSummary.grossProfit
    ),
    packagePerformance,
    tradeRows,
    riskFlags,
  };
}
