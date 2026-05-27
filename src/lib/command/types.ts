export type CommandObjectKind =
  | "project"
  | "takeoff"
  | "package"
  | "pricing"
  | "material"
  | "labour"
  | "standard"
  | "clarification"
  | "rfi"
  | "exclusion"
  | "assumption"
  | "document"
  | "labour_rate"
  | "material_rate"
  | "supplier_rate"
  | "subcontractor_rate"
  | "user"
  | "navigation"
  | "create";

export type CommandActionType =
  | "open"
  | "edit"
  | "apply"
  | "create"
  | "review"
  | "assign"
  | "export"
  | "navigate"
  | "pin";

export type CommandIndexEntry = {
  id: string;
  kind: CommandObjectKind;
  label: string;
  subtitle?: string;
  searchText: string;
  projectId?: string;
  entityId?: string;
  href?: string;
};

export type CommandResult = {
  id: string;
  action: CommandActionType;
  label: string;
  hint?: string;
  group: string;
  keywords?: string;
  entry?: CommandIndexEntry;
  pinKey?: string;
};

export type StoredCommandItem = {
  pinKey: string;
  kind: CommandObjectKind;
  label: string;
  subtitle?: string;
  href?: string;
  projectId?: string;
  entityId?: string;
};

export type CommandWorkspaceContext = {
  projectId: string;
  projectName: string;
  projectEntries: CommandIndexEntry[];
  navigateTab: (tab: string, options?: { priceTakeoff?: string }) => void;
  takeoffItem?: {
    id: string;
    itemName: string;
    trade: string;
  } | null;
  onApplyPackage?: () => void;
  onFocusTakeoffSearch?: () => void;
};
