import type { AiReviewItem } from "@/src/types/database";

import type { ProjectReadinessMetrics } from "@/src/lib/projects/readiness";

export type WorkspaceStepId =
  | "documents"
  | "scope"
  | "estimate"
  | "commercial"
  | "submit";

export type WorkspaceStepStatus = {
  id: WorkspaceStepId;
  label: string;
  detail: string;
  progressPercent: number | null;
  status: "not_started" | "in_progress" | "complete" | "blocked";
  issueCount: number | null;
};

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${Math.round(value)}%`;
}

export function computeWorkspaceSteps(input: {
  documentsCount: number;
  aiReviewItems: AiReviewItem[];
  readiness: ProjectReadinessMetrics;
  submissionReady: boolean;
  scopeGapsTotal: number;
  scopeGapsByKind?: Partial<Record<string, number>>;
}): WorkspaceStepStatus[] {
  const {
    documentsCount,
    aiReviewItems,
    readiness,
    submissionReady,
    scopeGapsTotal,
    scopeGapsByKind = {},
  } = input;

  const aiTotal = aiReviewItems.length;
  const aiApproved = aiReviewItems.filter(
    (item) => item.status === "accepted" || item.status === "rejected"
  ).length;
  const aiReviewComplete =
    aiTotal === 0 ? documentsCount > 0 : aiApproved === aiTotal;
  const aiReviewPercent =
    aiTotal === 0 ? null : Math.round((aiApproved / aiTotal) * 100);
  const aiPending = aiReviewItems.filter(
    (item) => item.status === "pending" || item.status === "adjusted"
  ).length;

  const buildUpPercent =
    readiness.materialGenerationPercent !== null &&
    readiness.labourGenerationPercent !== null
      ? Math.round(
          (readiness.materialGenerationPercent +
            readiness.labourGenerationPercent) /
            2
        )
      : readiness.packageCoveragePercent;

  const commercialPercent = readiness.pricingCoveragePercent;

  const missingPackage = Number(scopeGapsByKind["missing_package"] ?? 0);
  const missingMaterials = Number(
    scopeGapsByKind["missing_material_generation"] ?? 0
  );
  const missingLabour = Number(scopeGapsByKind["missing_labour_generation"] ?? 0);
  const missingPricing = Number(scopeGapsByKind["missing_pricing"] ?? 0);

  function resolveStatus(input: {
    progressPercent: number | null;
    complete: boolean;
    blocked: boolean;
  }): WorkspaceStepStatus["status"] {
    if (input.complete) {
      return "complete";
    }
    if (input.blocked) {
      return "blocked";
    }
    if (input.progressPercent === null || input.progressPercent <= 0) {
      return "not_started";
    }
    return "in_progress";
  }

  return [
    {
      id: "documents",
      label: "Documents",
      detail:
        documentsCount === 0
          ? "No documents"
          : `${documentsCount} document${documentsCount === 1 ? "" : "s"}`,
      progressPercent: documentsCount > 0 ? 100 : 0,
      status: resolveStatus({
        progressPercent: documentsCount > 0 ? 100 : 0,
        complete: documentsCount > 0,
        blocked: false,
      }),
      issueCount: documentsCount === 0 ? 1 : 0,
    },
    {
      id: "scope",
      label: "Scope",
      detail:
        aiTotal === 0
          ? "No suggestions"
          : `${aiApproved} / ${aiTotal} approved`,
      progressPercent: aiReviewPercent,
      status: resolveStatus({
        progressPercent: aiReviewPercent,
        complete: aiReviewComplete,
        blocked: documentsCount === 0,
      }),
      issueCount: aiTotal === 0 ? null : aiPending,
    },
    {
      id: "estimate",
      label: "Estimate",
      detail: formatPercent(buildUpPercent),
      progressPercent: buildUpPercent,
      status: resolveStatus({
        progressPercent: buildUpPercent,
        complete:
          buildUpPercent !== null &&
          buildUpPercent >= 80 &&
          readiness.priceableTakeoffItems > 0 &&
          scopeGapsTotal === 0,
        blocked: documentsCount === 0,
      }),
      issueCount: missingPackage + missingMaterials + missingLabour,
    },
    {
      id: "commercial",
      label: "Commercial",
      detail: formatPercent(commercialPercent),
      progressPercent: commercialPercent,
      status: resolveStatus({
        progressPercent: commercialPercent,
        complete:
          commercialPercent !== null &&
          commercialPercent >= 100 &&
          readiness.unpricedItems === 0,
        blocked: documentsCount === 0,
      }),
      issueCount: missingPricing,
    },
    {
      id: "submit",
      label: "Submission",
      detail: submissionReady ? "Ready" : "In progress",
      progressPercent: submissionReady ? 100 : null,
      status: resolveStatus({
        progressPercent: submissionReady ? 100 : null,
        complete: submissionReady,
        blocked: documentsCount === 0,
      }),
      issueCount: submissionReady ? 0 : null,
    },
  ];
}
