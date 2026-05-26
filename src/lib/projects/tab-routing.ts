import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

const LEGACY_TAB_MAP: Record<string, WorkspaceTabValue> = {
  documents: "tender-inputs",
  takeoff: "tender-inputs",
  materials: "scope-review",
  labour: "scope-review",
  pricing: "commercial-review",
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
    value === "tender-inputs" ||
    value === "ai-review" ||
    value === "scope-review" ||
    value === "commercial-review" ||
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
      return { tab: "tender-inputs" };
    case "missing_pricing":
      return { tab: "commercial-review", priceTakeoff: takeoffId };
    case "missing_material_generation":
    case "missing_labour_generation":
      return { tab: "scope-review" };
    default:
      return { tab: "scope-review" };
  }
}
