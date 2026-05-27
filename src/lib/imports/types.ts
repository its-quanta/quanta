export type ImportType =
  | "labour_rates"
  | "material_rates"
  | "supplier_rates"
  | "subcontractor_rates"
  | "packages"
  | "package_components"
  | "standards"
  | "clarification_templates";

export type DuplicateStrategy = "skip" | "overwrite" | "create_new";

export type ImportValidationSeverity = "critical" | "warning" | "info";

export type ImportFieldDefinition = {
  key: string;
  label: string;
  required: boolean;
  example: string;
  aliases?: string[];
};

export type ImportTypeDefinition = {
  id: ImportType | "historical_tenders";
  title: string;
  description: string;
  fields: ImportFieldDefinition[];
  placeholder?: boolean;
};

export type ParsedImportFile = {
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
};

export type ColumnMapping = {
  sourceColumn: string;
  destinationField: string | null;
};

export type ImportValidationIssue = {
  id: string;
  severity: ImportValidationSeverity;
  message: string;
  rowNumber?: number;
  field?: string;
};

export type ImportRowFailure = {
  rowNumber: number;
  reason: string;
  originalValue: string;
};

export type ImportExecutionResult = {
  imported: number;
  failed: number;
  failures: ImportRowFailure[];
  batchId: string | null;
};

export type ImportBatch = {
  id: string;
  organisation_id: string;
  import_type: ImportType;
  rows_imported: number;
  rows_failed: number;
  duplicate_strategy: DuplicateStrategy;
  imported_by: string | null;
  created_at: string;
};
