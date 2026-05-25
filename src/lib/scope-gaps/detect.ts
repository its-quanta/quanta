import { SCOPE_GAP_FIX_TAB, SCOPE_GAP_LABELS } from "@/src/lib/scope-gaps/constants";
import type {
  ScopeGap,
  ScopeGapKind,
  ScopeGapSummary,
} from "@/src/lib/scope-gaps/types";
import type {
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLink,
  TakeoffItem,
  TakeoffItemAssembly,
} from "@/src/types/database";

export type ScopeGapDetectionInput = {
  projectId: string;
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssembly[];
  pricingItems: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  standardLinks: StandardLink[];
};

function emptyByKind(): Record<ScopeGapKind, number> {
  return {
    missing_package: 0,
    missing_pricing: 0,
    missing_material_generation: 0,
    missing_labour_generation: 0,
    missing_drawing_reference: 0,
    missing_standards_reference: 0,
  };
}

function hasDrawingReference(item: TakeoffItem): boolean {
  if (item.drawing_reference?.trim()) {
    return true;
  }
  if (item.document_page_id) {
    return true;
  }
  if (item.sheet_number?.trim()) {
    return true;
  }
  return false;
}

function buildGap(
  projectId: string,
  takeoff: TakeoffItem,
  kind: ScopeGapKind,
  detail: string
): ScopeGap {
  return {
    id: `${takeoff.id}-${kind}`,
    kind,
    project_id: projectId,
    takeoff_item_id: takeoff.id,
    takeoff_item_name: takeoff.item_name,
    trade: takeoff.trade,
    label: SCOPE_GAP_LABELS[kind],
    detail,
    fix_tab: SCOPE_GAP_FIX_TAB[kind],
  };
}

export function detectProjectScopeGaps(
  input: ScopeGapDetectionInput
): ScopeGapSummary {
  const {
    projectId,
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
  const pricingByTakeoff = new Set(
    pricingItems.map((row) => row.takeoff_item_id)
  );
  const materialCountByTakeoff = new Map<string, number>();
  const labourCountByTakeoff = new Map<string, number>();

  for (const row of materialItems) {
    materialCountByTakeoff.set(
      row.takeoff_item_id,
      (materialCountByTakeoff.get(row.takeoff_item_id) ?? 0) + 1
    );
  }

  for (const row of labourItems) {
    labourCountByTakeoff.set(
      row.takeoff_item_id,
      (labourCountByTakeoff.get(row.takeoff_item_id) ?? 0) + 1
    );
  }

  const standardsByTakeoff = new Set(
    standardLinks
      .filter((link) => link.entity_type === "takeoff_item")
      .map((link) => link.entity_id)
  );

  const gaps: ScopeGap[] = [];
  const byKind = emptyByKind();

  for (const takeoff of takeoffItems) {
    if (takeoff.status === "excluded") {
      continue;
    }

    const assembly = assemblyByTakeoff.get(takeoff.id);

    if (!assembly) {
      const gap = buildGap(
        projectId,
        takeoff,
        "missing_package",
        "No assembly package applied to this takeoff line."
      );
      gaps.push(gap);
      byKind.missing_package += 1;
    }

    if (!pricingByTakeoff.has(takeoff.id)) {
      const gap = buildGap(
        projectId,
        takeoff,
        "missing_pricing",
        "No pricing line linked to this takeoff item."
      );
      gaps.push(gap);
      byKind.missing_pricing += 1;
    }

    if (assembly && (materialCountByTakeoff.get(takeoff.id) ?? 0) === 0) {
      const gap = buildGap(
        projectId,
        takeoff,
        "missing_material_generation",
        "Package applied but no material lines were generated."
      );
      gaps.push(gap);
      byKind.missing_material_generation += 1;
    }

    if (assembly && (labourCountByTakeoff.get(takeoff.id) ?? 0) === 0) {
      const gap = buildGap(
        projectId,
        takeoff,
        "missing_labour_generation",
        "Package applied but no labour lines were generated."
      );
      gaps.push(gap);
      byKind.missing_labour_generation += 1;
    }

    if (!hasDrawingReference(takeoff)) {
      const gap = buildGap(
        projectId,
        takeoff,
        "missing_drawing_reference",
        "Add a drawing reference, sheet number, or linked document page."
      );
      gaps.push(gap);
      byKind.missing_drawing_reference += 1;
    }

    if (!standardsByTakeoff.has(takeoff.id)) {
      const gap = buildGap(
        projectId,
        takeoff,
        "missing_standards_reference",
        "Link at least one standard from your organisation library."
      );
      gaps.push(gap);
      byKind.missing_standards_reference += 1;
    }
  }

  return {
    totalGaps: gaps.length,
    byKind,
    gaps,
  };
}
