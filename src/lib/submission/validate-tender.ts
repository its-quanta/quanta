import { computeMaterialsSummary, computeLabourSummary } from "@/src/lib/estimate-generation/summary";
import { computePricingSummary } from "@/src/lib/pricing/summary";
import type { OrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  Document,
  DocumentClassification,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLink,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

import type {
  SubmissionReadinessStatus,
  TenderValidationAction,
  TenderValidationIssue,
  TenderValidationResult,
  ValidationCategory,
  ValidationCheck,
  ValidationSeverity,
} from "./types";

export type ValidateTenderInput = {
  documents: Document[];
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItemWithTakeoff[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  standardLinks: StandardLink[];
  clarifications: TenderClarification[];
  organisationSettings: OrganisationSettingsSnapshot;
};

const CATEGORY_ORDER: ValidationCategory[] = [
  "document",
  "takeoff",
  "package",
  "pricing",
  "material",
  "labour",
  "standards",
  "submission",
];

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  document: "Document validation",
  takeoff: "Takeoff validation",
  package: "Package validation",
  pricing: "Pricing validation",
  material: "Material validation",
  labour: "Labour validation",
  standards: "Standards validation",
  submission: "Submission validation",
};

function percent(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

function hasDocumentType(
  documents: Document[],
  type: DocumentClassification
): boolean {
  return documents.some((doc) => doc.document_type === type);
}

function issueFromCheck(
  check: ValidationCheck,
  action: TenderValidationAction,
  relatedItem?: string | null
): TenderValidationIssue {
  return {
    id: `check-${check.id}`,
    title: check.label,
    description: check.detail,
    severity: check.severityOnFail,
    category: check.category,
    relatedItem: relatedItem ?? null,
    actionRequired: action.label,
    status: "open",
    action,
  };
}

function buildChecks(input: ValidateTenderInput): ValidationCheck[] {
  const {
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    materialItems,
    labourItems,
    standardLinks,
    clarifications,
    organisationSettings,
  } = input;

  const priceableTakeoff = takeoffItems.filter((item) => item.status !== "excluded");
  const priceableCount = priceableTakeoff.length;

  const pricedIds = new Set(pricingItems.map((item) => item.takeoff_item_id));
  const pricedCount = priceableTakeoff.filter((item) =>
    pricedIds.has(item.id)
  ).length;
  const unpricedCount = Math.max(0, priceableCount - pricedCount);

  const assemblyByTakeoff = new Set(
    takeoffAssemblies.map((row) => row.takeoff_item_id)
  );
  const packageApplied = priceableTakeoff.filter((item) =>
    assemblyByTakeoff.has(item.id)
  ).length;
  const missingPackage = Math.max(0, priceableCount - packageApplied);
  const packageCoverage = percent(packageApplied, priceableCount);

  const missingQuantity = priceableTakeoff.filter(
    (item) => item.quantity <= 0 || !item.item_name.trim()
  ).length;

  const missingDrawingRef = priceableTakeoff.filter(
    (item) => !item.drawing_reference?.trim() && !item.document_page_id
  ).length;

  const missingSpecRef = priceableTakeoff.filter(
    (item) => !item.specification_reference?.trim()
  ).length;

  const unreviewedTakeoff = priceableTakeoff.filter((item) => !item.reviewed).length;

  const pricingSummary = computePricingSummary(pricingItems, takeoffItems);
  const materialsSummary = computeMaterialsSummary(materialItems);
  const labourSummary = computeLabourSummary(labourItems);

  const defaultMargin = organisationSettings.default_margin_percentage;
  const marginBelowTarget =
    defaultMargin !== null &&
    pricingSummary.averageMarginPercent !== null &&
    pricingSummary.averageMarginPercent < defaultMargin;

  let manualPricingCount = 0;
  for (const item of pricingItems) {
    const hasPackage = assemblyByTakeoff.has(item.takeoff_item_id);
    if (item.pricing_method !== "package" && !hasPackage) {
      manualPricingCount += 1;
    }
  }
  const manualPricingPercent = percent(manualPricingCount, pricingItems.length);

  const withPackage = priceableTakeoff.filter((item) =>
    assemblyByTakeoff.has(item.id)
  );
  const materialByTakeoff = new Set(
    materialItems.map((row) => row.takeoff_item_id)
  );
  const labourByTakeoff = new Set(
    labourItems.map((row) => row.takeoff_item_id)
  );
  const missingMaterialGen = withPackage.filter(
    (item) => !materialByTakeoff.has(item.id)
  ).length;
  const missingLabourGen = withPackage.filter(
    (item) => !labourByTakeoff.has(item.id)
  ).length;

  const standardsByTakeoff = new Set(
    standardLinks
      .filter((link) => link.entity_type === "takeoff_item")
      .map((link) => link.entity_id)
  );
  const missingStandards = priceableTakeoff.filter(
    (item) => !standardsByTakeoff.has(item.id)
  ).length;

  const exclusions = clarifications.filter((c) => c.type === "exclusion");
  const assumptions = clarifications.filter((c) => c.type === "assumption");
  const rfis = clarifications.filter((c) => c.type === "rfi");
  const openRfis = rfis.filter(
    (rfi) => rfi.status === "open" || rfi.status === "draft"
  );

  const takeoffLinkedToDrawing = priceableTakeoff.filter(
    (item) =>
      item.document_page_id ||
      item.drawing_reference?.trim() ||
      item.source_document_id
  ).length;

  return [
    {
      id: "doc-architectural",
      category: "document",
      label: "Architectural drawings uploaded",
      passed: hasDocumentType(documents, "architectural_drawings"),
      detail: hasDocumentType(documents, "architectural_drawings")
        ? "Architectural set on file"
        : "Upload architectural drawings in Tender Inputs",
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "doc-structural",
      category: "document",
      label: "Structural drawings uploaded",
      passed: hasDocumentType(documents, "structural_drawings"),
      detail: hasDocumentType(documents, "structural_drawings")
        ? "Structural set on file"
        : "Structural drawings not uploaded",
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "doc-specification",
      category: "document",
      label: "Specification uploaded",
      passed:
        hasDocumentType(documents, "specification") ||
        hasDocumentType(documents, "scope_document"),
      detail:
        hasDocumentType(documents, "specification") ||
        hasDocumentType(documents, "scope_document")
          ? "Specification or scope document on file"
          : "Upload specification in Tender Inputs",
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "doc-drawings-linked",
      category: "document",
      label: "Drawings linked to takeoff",
      passed:
        priceableCount === 0 ||
        percent(takeoffLinkedToDrawing, priceableCount) === 100,
      detail:
        priceableCount === 0
          ? "No takeoff lines yet"
          : `${takeoffLinkedToDrawing} of ${priceableCount} lines linked to drawings`,
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "doc-any",
      category: "document",
      label: "Tender documents uploaded",
      passed: documents.length > 0,
      detail:
        documents.length > 0
          ? `${documents.length} document${documents.length === 1 ? "" : "s"} on file`
          : "No documents uploaded",
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "takeoff-exists",
      category: "takeoff",
      label: "Takeoff items exist",
      passed: priceableCount > 0,
      detail:
        priceableCount > 0
          ? `${priceableCount} priceable takeoff lines`
          : "Add takeoff lines in Tender Inputs",
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "takeoff-quantities",
      category: "takeoff",
      label: "Quantities complete",
      passed: missingQuantity === 0,
      detail:
        missingQuantity === 0
          ? "All lines have quantity and item name"
          : `${missingQuantity} line${missingQuantity === 1 ? "" : "s"} missing quantity or name`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "takeoff-drawing-ref",
      category: "takeoff",
      label: "Drawing references complete",
      passed: missingDrawingRef === 0,
      detail:
        missingDrawingRef === 0
          ? "All lines have drawing references"
          : `${missingDrawingRef} line${missingDrawingRef === 1 ? "" : "s"} without drawing reference`,
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "takeoff-spec-ref",
      category: "takeoff",
      label: "Specification references",
      passed: missingSpecRef === 0,
      detail:
        missingSpecRef === 0
          ? "Specification references recorded"
          : `${missingSpecRef} line${missingSpecRef === 1 ? "" : "s"} without specification reference`,
      severityOnFail: "info",
      weight: 1,
    },
    {
      id: "takeoff-reviewed",
      category: "takeoff",
      label: "Takeoff reviewed",
      passed: unreviewedTakeoff === 0 && priceableCount > 0,
      detail:
        priceableCount === 0
          ? "No takeoff to review"
          : unreviewedTakeoff === 0
            ? "All takeoff lines reviewed"
            : `${unreviewedTakeoff} line${unreviewedTakeoff === 1 ? "" : "s"} not reviewed`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "package-coverage",
      category: "package",
      label: "Package coverage",
      passed: packageCoverage === 100,
      detail:
        packageCoverage === null
          ? "No priceable takeoff"
          : `${packageCoverage}% of lines have methodology applied`,
      severityOnFail: "info",
      weight: 1,
    },
    {
      id: "package-missing",
      category: "package",
      label: "Methodology applied",
      passed: missingPackage === 0,
      detail:
        missingPackage === 0
          ? "All priceable lines have a package"
          : `${missingPackage} line${missingPackage === 1 ? "" : "s"} missing package`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "package-coverage-threshold",
      category: "package",
      label: "Package coverage above 90%",
      passed: packageCoverage !== null && packageCoverage >= 90,
      detail:
        packageCoverage === null
          ? "No priceable takeoff"
          : `Package coverage is ${packageCoverage}%`,
      severityOnFail: "info",
      weight: 1,
    },
    {
      id: "pricing-coverage",
      category: "pricing",
      label: "Pricing coverage",
      passed: unpricedCount === 0 && priceableCount > 0,
      detail: `${pricedCount} of ${priceableCount} lines priced`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "pricing-unpriced",
      category: "pricing",
      label: "No unpriced items",
      passed: unpricedCount === 0,
      detail:
        unpricedCount === 0
          ? "All lines priced"
          : `${unpricedCount} takeoff item${unpricedCount === 1 ? "" : "s"} unpriced`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "pricing-manual-share",
      category: "pricing",
      label: "Manual pricing share",
      passed: manualPricingPercent === null || manualPricingPercent <= 50,
      detail:
        manualPricingPercent === null
          ? "No priced lines"
          : `${manualPricingPercent}% of priced lines are manual`,
      severityOnFail: "info",
      weight: 1,
    },
    {
      id: "pricing-margin",
      category: "pricing",
      label: "Margin above target",
      passed: !marginBelowTarget,
      detail: marginBelowTarget
        ? `Margin ${pricingSummary.averageMarginPercent?.toFixed(1)}% below default ${defaultMargin?.toFixed(1)}%`
        : "Margin meets organisation target",
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "material-generated",
      category: "material",
      label: "Materials generated",
      passed: withPackage.length === 0 || missingMaterialGen === 0,
      detail:
        withPackage.length === 0
          ? "No packaged lines"
          : missingMaterialGen === 0
            ? "Materials generated for packaged lines"
            : `${missingMaterialGen} packaged line${missingMaterialGen === 1 ? "" : "s"} missing materials`,
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "material-reviewed",
      category: "material",
      label: "Materials reviewed",
      passed:
        materialItems.length === 0 ||
        materialsSummary.outstandingReviewCount === 0,
      detail:
        materialItems.length === 0
          ? "No material lines"
          : materialsSummary.outstandingReviewCount === 0
            ? "All material lines reviewed"
            : `${materialsSummary.outstandingReviewCount} material line${materialsSummary.outstandingReviewCount === 1 ? "" : "s"} not reviewed`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "labour-generated",
      category: "labour",
      label: "Labour generated",
      passed: withPackage.length === 0 || missingLabourGen === 0,
      detail:
        withPackage.length === 0
          ? "No packaged lines"
          : missingLabourGen === 0
            ? "Labour generated for packaged lines"
            : `${missingLabourGen} packaged line${missingLabourGen === 1 ? "" : "s"} missing labour`,
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "labour-reviewed",
      category: "labour",
      label: "Labour reviewed",
      passed:
        labourItems.length === 0 || labourSummary.outstandingReviewCount === 0,
      detail:
        labourItems.length === 0
          ? "No labour lines"
          : labourSummary.outstandingReviewCount === 0
            ? "All labour lines reviewed"
            : `${labourSummary.outstandingReviewCount} labour line${labourSummary.outstandingReviewCount === 1 ? "" : "s"} not reviewed`,
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "standards-linked",
      category: "standards",
      label: "Standards linked",
      passed: missingStandards === 0 || priceableCount === 0,
      detail:
        priceableCount === 0
          ? "No takeoff lines"
          : missingStandards === 0
            ? "Standards referenced on takeoff lines"
            : `${missingStandards} line${missingStandards === 1 ? "" : "s"} without standards`,
      severityOnFail: "warning",
      weight: 2,
    },
    {
      id: "submission-exclusions",
      category: "submission",
      label: "Exclusions drafted",
      passed: exclusions.length > 0,
      detail:
        exclusions.length > 0
          ? `${exclusions.length} exclusion${exclusions.length === 1 ? "" : "s"} recorded`
          : "Draft at least one exclusion before submission",
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "submission-assumptions",
      category: "submission",
      label: "Assumptions drafted",
      passed: assumptions.length > 0,
      detail:
        assumptions.length > 0
          ? `${assumptions.length} assumption${assumptions.length === 1 ? "" : "s"} recorded`
          : "Draft at least one assumption before submission",
      severityOnFail: "critical",
      weight: 3,
    },
    {
      id: "submission-rfis",
      category: "submission",
      label: "RFIs resolved",
      passed: openRfis.length === 0,
      detail:
        rfis.length === 0
          ? "No RFIs raised"
          : openRfis.length === 0
            ? "All RFIs answered or closed"
            : `${openRfis.length} open RFI${openRfis.length === 1 ? "" : "s"}`,
      severityOnFail: "warning",
      weight: 2,
    },
  ];
}

function actionForCheck(check: ValidationCheck): TenderValidationAction {
  switch (check.id) {
    case "doc-architectural":
    case "doc-structural":
    case "doc-specification":
    case "doc-any":
      return { id: "open-documents", label: "Upload documents", tab: "tender-inputs" };
    case "doc-drawings-linked":
    case "takeoff-drawing-ref":
    case "takeoff-spec-ref":
    case "takeoff-exists":
    case "takeoff-quantities":
    case "takeoff-reviewed":
      return { id: "open-takeoff", label: "Open takeoff", tab: "tender-inputs" };
    case "package-missing":
    case "package-coverage":
    case "package-coverage-threshold":
      return {
        id: "apply-package",
        label: "Apply methodology",
        tab: "tender-inputs",
      };
    case "pricing-coverage":
    case "pricing-unpriced":
    case "pricing-manual-share":
    case "pricing-margin":
      return { id: "fix-pricing", label: "Fix pricing", tab: "commercial-review" };
    case "material-generated":
    case "material-reviewed":
      return {
        id: "review-materials",
        label: "Review materials",
        tab: "scope-review",
      };
    case "labour-generated":
    case "labour-reviewed":
      return { id: "review-labour", label: "Review labour", tab: "scope-review" };
    case "standards-linked":
      return { id: "add-standards", label: "Add standards", tab: "tender-inputs" };
    case "submission-exclusions":
      return {
        id: "draft-exclusions",
        label: "Draft exclusions",
        tab: "submission",
        section: "exclusions",
      };
    case "submission-assumptions":
      return {
        id: "draft-assumptions",
        label: "Draft assumptions",
        tab: "submission",
        section: "assumptions",
      };
    case "submission-rfis":
      return {
        id: "manage-rfis",
        label: "Manage RFIs",
        tab: "submission",
        section: "rfis",
      };
    default:
      return { id: "open-overview", label: "Review project", tab: "overview" };
  }
}

function deriveReadinessStatus(
  checks: ValidationCheck[],
  issues: TenderValidationIssue[]
): {
  status: SubmissionReadinessStatus;
  label: string;
  blockReasons: string[];
} {
  const criticalIssues = issues.filter((issue) => issue.severity === "critical");

  const gateIds = [
    "pricing-coverage",
    "takeoff-reviewed",
    "package-missing",
    "material-reviewed",
    "labour-reviewed",
    "submission-exclusions",
    "submission-assumptions",
  ] as const;

  const blockReasons: string[] = [];

  if (criticalIssues.length > 0) {
    blockReasons.push(
      `${criticalIssues.length} critical issue${criticalIssues.length === 1 ? "" : "s"} must be resolved`
    );
  }

  for (const gateId of gateIds) {
    const check = checks.find((row) => row.id === gateId);
    if (check && !check.passed) {
      blockReasons.push(check.detail);
    }
  }

  const status: SubmissionReadinessStatus =
    criticalIssues.length === 0 &&
    gateIds.every((gateId) => checks.find((row) => row.id === gateId)?.passed)
      ? "ready"
      : "not_ready";

  return {
    status,
    label:
      status === "ready" ? "Ready for submission" : "Not ready for submission",
    blockReasons,
  };
}

export function validateTender(input: ValidateTenderInput): TenderValidationResult {
  const checks = buildChecks(input);

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const passedWeight = checks
    .filter((check) => check.passed)
    .reduce((sum, check) => sum + check.weight, 0);

  const readinessScore =
    totalWeight === 0
      ? 0
      : Math.round((passedWeight / totalWeight) * 100);

  const issues: TenderValidationIssue[] = checks
    .filter((check) => !check.passed)
    .map((check) => issueFromCheck(check, actionForCheck(check)));

  const actionMap = new Map<string, TenderValidationAction>();
  for (const issue of issues) {
    actionMap.set(issue.action.id, issue.action);
  }
  const actions = [...actionMap.values()];

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const { status, label, blockReasons } = deriveReadinessStatus(checks, issues);

  const checksByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = checks.filter((check) => check.category === category);
      return acc;
    },
    {} as Record<ValidationCategory, ValidationCheck[]>
  );

  return {
    readinessScore,
    readinessStatus: status,
    readinessLabel: label,
    blockReasons,
    checks,
    issues,
    actions,
    criticalCount,
    warningCount,
    infoCount,
    checksByCategory,
  };
}

export { CATEGORY_LABELS };
