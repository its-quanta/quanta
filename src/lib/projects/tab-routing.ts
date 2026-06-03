import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

/**
 * Maps legacy ?tab= values and aliases to the 5-stage workspace tabs.
 * Phase 1: navigation only — underlying panels are unchanged.
 */
const LEGACY_TAB_MAP: Record<string, WorkspaceTabValue> = {
  overview: "documents",
  "plans-specs": "documents",
  documents: "documents",
  "tender-inputs": "documents",
  "ai-review": "scope",
  takeoff: "scope",
  scope: "scope",
  "build-up": "estimate",
  materials: "estimate",
  labour: "estimate",
  "scope-review": "estimate",
  estimate: "estimate",
  pricing: "commercial",
  "commercial-review": "commercial",
  commercial: "commercial",
  clarifications: "submission",
  export: "submission",
  submission: "submission",
};

export const WORKSPACE_TAB_DEFAULT: WorkspaceTabValue = "documents";

export function resolveWorkspaceTab(
  tabParam: string | null
): WorkspaceTabValue {
  if (!tabParam) {
    return WORKSPACE_TAB_DEFAULT;
  }

  if (isWorkspaceTab(tabParam)) {
    return tabParam;
  }

  return LEGACY_TAB_MAP[tabParam] ?? WORKSPACE_TAB_DEFAULT;
}

export function isWorkspaceTab(value: string): value is WorkspaceTabValue {
  return (
    value === "documents" ||
    value === "scope" ||
    value === "estimate" ||
    value === "commercial" ||
    value === "submission"
  );
}

/** Legacy tab slugs still accepted in URLs (see LEGACY_TAB_MAP). */
export const SUPPORTED_LEGACY_WORKSPACE_TABS = [
  "overview",
  "plans-specs",
  "ai-review",
  "takeoff",
  "build-up",
  "pricing",
  "commercial-review",
  "clarifications",
  "export",
  "tender-inputs",
  "materials",
  "labour",
  "scope-review",
] as const;

export function scopeGapFixTab(
  kind: string,
  takeoffId?: string
): { tab: WorkspaceTabValue; priceTakeoff?: string } {
  switch (kind) {
    case "missing_package":
    case "missing_drawing_reference":
    case "missing_standards_reference":
      return { tab: "scope" };
    case "missing_pricing":
      return { tab: "commercial", priceTakeoff: takeoffId };
    case "missing_material_generation":
    case "missing_labour_generation":
      return { tab: "estimate" };
    default:
      return { tab: "estimate" };
  }
}
