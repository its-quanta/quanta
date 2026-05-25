import type {
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type MaterialsSummaryTotals = {
  totalCost: number;
  itemCount: number;
  outstandingReviewCount: number;
};

export type LabourSummaryTotals = {
  totalHours: number;
  totalCost: number;
  totalSell: number;
  outstandingReviewCount: number;
};

export function computeMaterialsSummary(
  items: ProjectMaterialItem[]
): MaterialsSummaryTotals {
  let totalCost = 0;
  let outstandingReviewCount = 0;

  for (const item of items) {
    totalCost += item.total_cost;
    if (!item.reviewed) {
      outstandingReviewCount += 1;
    }
  }

  return {
    totalCost,
    itemCount: items.length,
    outstandingReviewCount,
  };
}

export function computeLabourSummary(
  items: ProjectLabourItem[]
): LabourSummaryTotals {
  let totalHours = 0;
  let totalCost = 0;
  let totalSell = 0;
  let outstandingReviewCount = 0;

  for (const item of items) {
    totalHours += item.hours;
    totalCost += item.total_cost;
    totalSell += item.total_sell;
    if (!item.reviewed) {
      outstandingReviewCount += 1;
    }
  }

  return {
    totalHours,
    totalCost,
    totalSell,
    outstandingReviewCount,
  };
}

export type GenerationSourceInfo = {
  packageName: string;
  regeneratedAt: string;
};

export function getGenerationSources(
  assemblies: TakeoffItemAssemblyWithPackage[]
): GenerationSourceInfo[] {
  const byPackage = new Map<string, GenerationSourceInfo>();

  for (const assembly of assemblies) {
    const existing = byPackage.get(assembly.assembly_package_id);
    const regeneratedAt = assembly.updated_at;

    if (!existing || regeneratedAt > existing.regeneratedAt) {
      byPackage.set(assembly.assembly_package_id, {
        packageName: assembly.assembly_package.name,
        regeneratedAt,
      });
    }
  }

  return [...byPackage.values()].sort((a, b) =>
    b.regeneratedAt.localeCompare(a.regeneratedAt)
  );
}
