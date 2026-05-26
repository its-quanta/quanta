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
  missing_package: "tender-inputs",
  missing_pricing: "commercial-review",
  missing_material_generation: "scope-review",
  missing_labour_generation: "scope-review",
  missing_drawing_reference: "tender-inputs",
  missing_standards_reference: "tender-inputs",
};
