import type { ScopeGapKind, WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

export const SCOPE_GAP_LABELS: Record<ScopeGapKind, string> = {
  missing_package: "Missing package",
  missing_pricing: "Missing pricing",
  missing_material_generation: "Missing material generation",
  missing_labour_generation: "Missing labour generation",
  missing_drawing_reference: "Missing drawing reference",
  missing_standards_reference: "Missing standards reference",
};

export const SCOPE_GAP_FIX_TAB: Record<ScopeGapKind, WorkspaceTabValue | null> = {
  missing_package: "scope",
  missing_pricing: "commercial",
  missing_material_generation: "estimate",
  missing_labour_generation: "estimate",
  missing_drawing_reference: "scope",
  missing_standards_reference: "scope",
};
