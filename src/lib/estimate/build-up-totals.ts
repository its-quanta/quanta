import { roundMoney } from "@/src/lib/pricing/calculations";
import type {
  EstimatePricingSource,
  ProjectLabourItem,
  ProjectMaterialItem,
} from "@/src/types/database";

export function isGeneratedBuildUpLine(
  pricingSource: EstimatePricingSource
): boolean {
  return pricingSource === "assembly" || pricingSource === "assembly_package";
}

export function filterMaterialsForTakeoff(
  materialItems: ProjectMaterialItem[],
  takeoffItemId: string
): ProjectMaterialItem[] {
  return materialItems.filter((row) => row.takeoff_item_id === takeoffItemId);
}

export function filterLabourForTakeoff(
  labourItems: ProjectLabourItem[],
  takeoffItemId: string
): ProjectLabourItem[] {
  return labourItems.filter((row) => row.takeoff_item_id === takeoffItemId);
}

export function sumMaterialCost(lines: ProjectMaterialItem[]): number {
  return roundMoney(lines.reduce((sum, row) => sum + row.total_cost, 0));
}

export function sumLabourCost(lines: ProjectLabourItem[]): number {
  return roundMoney(lines.reduce((sum, row) => sum + row.total_cost, 0));
}

export function computeBuildUpTotals(input: {
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  takeoffItemId: string;
  quantity: number;
}): {
  materialLines: ProjectMaterialItem[];
  labourLines: ProjectLabourItem[];
  materialsTotal: number;
  labourTotal: number;
  buildUpTotalCost: number;
  costRate: number | null;
  hasGeneratedLines: boolean;
} {
  const materialLines = filterMaterialsForTakeoff(
    input.materialItems,
    input.takeoffItemId
  );
  const labourLines = filterLabourForTakeoff(
    input.labourItems,
    input.takeoffItemId
  );

  const materialsTotal = sumMaterialCost(materialLines);
  const labourTotal = sumLabourCost(labourLines);
  const buildUpTotalCost = roundMoney(materialsTotal + labourTotal);

  const hasGeneratedLines =
    materialLines.some((row) => isGeneratedBuildUpLine(row.pricing_source)) ||
    labourLines.some((row) => isGeneratedBuildUpLine(row.pricing_source));

  const quantity = Math.max(0, input.quantity);
  const costRate =
    quantity > 0 && buildUpTotalCost > 0
      ? roundMoney(buildUpTotalCost / quantity)
      : null;

  return {
    materialLines,
    labourLines,
    materialsTotal,
    labourTotal,
    buildUpTotalCost,
    costRate,
    hasGeneratedLines,
  };
}
