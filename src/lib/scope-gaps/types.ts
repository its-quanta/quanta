export type ScopeGapKind =
  | "missing_package"
  | "missing_pricing"
  | "missing_material_generation"
  | "missing_labour_generation"
  | "missing_drawing_reference"
  | "missing_standards_reference";

export type WorkspaceTabValue =
  | "overview"
  | "tender-inputs"
  | "scope-review"
  | "commercial-review"
  | "submission";

export type ScopeGap = {
  id: string;
  kind: ScopeGapKind;
  project_id: string;
  takeoff_item_id: string;
  takeoff_item_name: string;
  trade: string;
  label: string;
  detail: string;
  fix_tab: WorkspaceTabValue | null;
};

export type ScopeGapSummary = {
  totalGaps: number;
  byKind: Record<ScopeGapKind, number>;
  gaps: ScopeGap[];
};

export type OrganisationScopeGapSummary = {
  totalGaps: number;
  byKind: Record<ScopeGapKind, number>;
  projectSummaries: {
    project_id: string;
    project_name: string;
    gap_count: number;
  }[];
};
