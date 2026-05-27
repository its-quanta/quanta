import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

const LEGACY_TAB_MAP: Record<string, WorkspaceTabValue> = {
  documents: "plans-specs",
  "tender-inputs": "plans-specs",
  takeoff: "takeoff",
  materials: "build-up",
  labour: "build-up",
  "scope-review": "build-up",
  pricing: "commercial",
  "commercial-review": "commercial",
  clarifications: "submission",
  export: "submission",
};

export function resolveWorkspaceTab(
  tabParam: string | null
): WorkspaceTabValue {
  if (!tabParam) {
    return "overview";
  }

  if (isWorkspaceTab(tabParam)) {
    return tabParam;
  }

  return LEGACY_TAB_MAP[tabParam] ?? "overview";
}

export function isWorkspaceTab(value: string): value is WorkspaceTabValue {
  return (
    value === "overview" ||
    value === "plans-specs" ||
    value === "ai-review" ||
    value === "takeoff" ||
    value === "build-up" ||
    value === "commercial" ||
    value === "submission"
  );
}

export function scopeGapFixTab(
  kind: string,
  takeoffId?: string
): { tab: WorkspaceTabValue; priceTakeoff?: string } {
  switch (kind) {
    case "missing_package":
    case "missing_drawing_reference":
    case "missing_standards_reference":
      return { tab: "takeoff" };
    case "missing_pricing":
      return { tab: "commercial", priceTakeoff: takeoffId };
    case "missing_material_generation":
    case "missing_labour_generation":
      return { tab: "build-up" };
    default:
      return { tab: "build-up" };
  }
}
