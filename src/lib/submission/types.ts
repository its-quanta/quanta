import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

export type ValidationSeverity = "critical" | "warning" | "info";

export type ValidationCategory =
  | "document"
  | "takeoff"
  | "package"
  | "pricing"
  | "material"
  | "labour"
  | "standards"
  | "submission";

export type ValidationCheck = {
  id: string;
  category: ValidationCategory;
  label: string;
  passed: boolean;
  detail: string;
  severityOnFail: ValidationSeverity;
  weight: number;
};

export type TenderValidationAction = {
  id: string;
  label: string;
  tab: WorkspaceTabValue;
  priceTakeoff?: string;
  section?: "exclusions" | "assumptions" | "rfis";
};

export type TenderValidationIssue = {
  id: string;
  title: string;
  description: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  relatedItem: string | null;
  actionRequired: string;
  status: "open";
  action: TenderValidationAction;
};

export type SubmissionReadinessStatus = "ready" | "not_ready";

export type TenderValidationResult = {
  readinessScore: number;
  readinessStatus: SubmissionReadinessStatus;
  readinessLabel: string;
  blockReasons: string[];
  checks: ValidationCheck[];
  issues: TenderValidationIssue[];
  actions: TenderValidationAction[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  checksByCategory: Record<ValidationCategory, ValidationCheck[]>;
};
