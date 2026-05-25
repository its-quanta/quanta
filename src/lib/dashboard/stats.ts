import type { Project, ProjectStatus } from "@/src/types/database";
import {
  formatCurrency,
  formatPercent,
  daysUntil,
} from "@/src/lib/format";
import type { TakeoffSummaryRow } from "@/src/lib/dashboard/queries";

const ACTIVE_STATUSES = new Set<ProjectStatus>([
  "draft",
  "in_review",
  "submitted",
]);
const CLOSED_STATUSES = new Set<ProjectStatus>(["won", "lost", "archived"]);

export type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
};

export type TenderRiskLevel = "none" | "low" | "medium" | "high" | "overdue";

export type ActiveTenderRow = {
  id: string;
  name: string;
  stage: ProjectStatus;
  pricingPercent: number | null;
  risk: TenderRiskLevel;
  dueDate: string | null;
  value: number | null;
};

export type UpcomingDeadline = {
  projectId: string;
  projectName: string;
  dueDate: string;
  daysUntil: number;
  status: ProjectStatus;
};

export type CommercialPerformanceMetric = {
  label: string;
  value: string;
  hint: string;
};

export type RatesHealthMetric = {
  label: string;
  value: string;
  hint: string;
};

export type TenderCommandCentreData = {
  pipelineMetrics: DashboardMetric[];
  activeTenders: ActiveTenderRow[];
  upcomingDeadlines: UpcomingDeadline[];
  commercialPerformance: CommercialPerformanceMetric[];
  ratesHealth: RatesHealthMetric[];
};

type ProjectTakeoffStats = {
  totalLines: number;
  pricedLines: number;
  scopeGaps: number;
};

function sumEstimatedValue(projects: Project[]): number {
  return projects.reduce(
    (total, project) => total + (project.estimated_value ?? 0),
    0
  );
}

function isScopeGap(row: TakeoffSummaryRow): boolean {
  if (row.status === "excluded") {
    return false;
  }

  if (row.status === "priced" || row.status === "reviewed") {
    return false;
  }

  if (row.status === "needs_review" || row.status === "ai_draft") {
    return true;
  }

  return row.reviewed !== true;
}

function isPricedLine(row: TakeoffSummaryRow): boolean {
  return row.status === "priced";
}

function buildTakeoffStatsByProject(
  rows: TakeoffSummaryRow[]
): Map<string, ProjectTakeoffStats> {
  const byProject = new Map<string, ProjectTakeoffStats>();

  for (const row of rows) {
    const current = byProject.get(row.project_id) ?? {
      totalLines: 0,
      pricedLines: 0,
      scopeGaps: 0,
    };

    if (row.status !== "excluded") {
      current.totalLines += 1;
      if (isPricedLine(row)) {
        current.pricedLines += 1;
      }
    }

    if (isScopeGap(row)) {
      current.scopeGaps += 1;
    }

    byProject.set(row.project_id, current);
  }

  return byProject;
}

function pricingCoverageForProject(stats: ProjectTakeoffStats | undefined): number | null {
  if (!stats || stats.totalLines === 0) {
    return null;
  }

  return (stats.pricedLines / stats.totalLines) * 100;
}

function averagePricingCoverage(
  projects: Project[],
  takeoffByProject: Map<string, ProjectTakeoffStats>
): number | null {
  const coverages = projects
    .map((project) => pricingCoverageForProject(takeoffByProject.get(project.id)))
    .filter((value): value is number => value !== null);

  if (coverages.length === 0) {
    return null;
  }

  return coverages.reduce((sum, value) => sum + value, 0) / coverages.length;
}

function deriveRisk(
  project: Project,
  scopeGaps: number
): TenderRiskLevel {
  const days = daysUntil(project.tender_due_date);

  if (days !== null && days < 0) {
    return "overdue";
  }

  if (days !== null && days <= 7) {
    return "high";
  }

  if (scopeGaps > 0 || project.status === "in_review") {
    return "medium";
  }

  if (days !== null && days <= 14) {
    return "low";
  }

  return "none";
}

export function getTenderRiskLabel(risk: TenderRiskLevel): string {
  switch (risk) {
    case "overdue":
      return "Overdue";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "—";
  }
}

function isDueSoon(project: Project, withinDays = 14): boolean {
  if (!project.tender_due_date || CLOSED_STATUSES.has(project.status)) {
    return false;
  }

  const days = daysUntil(project.tender_due_date);
  return days !== null && days >= 0 && days <= withinDays;
}

export function buildTenderCommandCentreData(
  projects: Project[],
  takeoffRows: TakeoffSummaryRow[]
): TenderCommandCentreData {
  const activeProjects = projects.filter((project) =>
    ACTIVE_STATUSES.has(project.status)
  );
  const takeoffByProject = buildTakeoffStatsByProject(takeoffRows);
  const pipelineValue = sumEstimatedValue(activeProjects);
  const orgPricingCoverage = averagePricingCoverage(
    activeProjects,
    takeoffByProject
  );
  const scopeGapsOutstanding = activeProjects.reduce((total, project) => {
    return total + (takeoffByProject.get(project.id)?.scopeGaps ?? 0);
  }, 0);

  const pipelineMetrics: DashboardMetric[] = [
    {
      label: "Active Tenders",
      value: String(activeProjects.length),
      hint: "Draft, in review, or submitted",
    },
    {
      label: "Tender Value Pipeline",
      value: pipelineValue > 0 ? formatCurrency(pipelineValue) : "—",
      hint: "Estimated sell price across active tenders",
    },
    {
      label: "Pricing Coverage",
      value: formatPercent(orgPricingCoverage),
      hint: "Takeoff lines priced vs total lines (active tenders)",
    },
    {
      label: "Scope Gaps Outstanding",
      value: scopeGapsOutstanding > 0 ? String(scopeGapsOutstanding) : "—",
      hint: "Unreviewed or unpriced takeoff lines",
    },
  ];

  const activeTenders: ActiveTenderRow[] = activeProjects.map((project) => {
    const stats = takeoffByProject.get(project.id);
    const scopeGaps = stats?.scopeGaps ?? 0;

    return {
      id: project.id,
      name: project.name,
      stage: project.status,
      pricingPercent: pricingCoverageForProject(stats),
      risk: deriveRisk(project, scopeGaps),
      dueDate: project.tender_due_date,
      value: project.estimated_value,
    };
  });

  const upcomingDeadlines: UpcomingDeadline[] = projects
    .filter((project) => isDueSoon(project))
    .map((project) => ({
      projectId: project.id,
      projectName: project.name,
      dueDate: project.tender_due_date!,
      daysUntil: daysUntil(project.tender_due_date)!,
      status: project.status,
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // TODO: derive from project_pricing_summary.margin_percent across active projects.
  const averageMargin: number | null = null;

  // TODO: derive from tender_clarifications where type = rfi and status = open.
  const openRfis = 0;

  const commercialPerformance: CommercialPerformanceMetric[] = [
    {
      label: "Average margin",
      value: formatPercent(averageMargin),
      hint: "Across active tenders",
    },
    {
      label: "Pricing coverage",
      value: formatPercent(orgPricingCoverage),
      hint: "Organisation-wide on active pipeline",
    },
    {
      label: "RFIs",
      value: openRfis > 0 ? String(openRfis) : "—",
      hint: "Open clarifications",
    },
    {
      label: "Scope gaps",
      value: scopeGapsOutstanding > 0 ? String(scopeGapsOutstanding) : "—",
      hint: "Lines awaiting review or pricing",
    },
  ];

  // TODO: derive from material_rates table when rates library ships.
  // TODO: derive from labour_rates table when rates library ships.
  // TODO: derive from supplier_rates table when supplier linking ships.
  // TODO: derive from rate revision dates for outdated count.
  const ratesHealth: RatesHealthMetric[] = [
    {
      label: "Material rates",
      value: "—",
      hint: "Rates library not yet connected",
    },
    {
      label: "Labour rates",
      value: "—",
      hint: "Rates library not yet connected",
    },
    {
      label: "Supplier rates",
      value: "—",
      hint: "Supplier rate linking not yet connected",
    },
    {
      label: "Outdated rates",
      value: "—",
      hint: "Revision tracking not yet connected",
    },
  ];

  return {
    pipelineMetrics,
    activeTenders,
    upcomingDeadlines,
    commercialPerformance,
    ratesHealth,
  };
}

/** @deprecated Use buildTenderCommandCentreData */
export function buildDashboardStats(
  projects: Project[],
  takeoffRows: TakeoffSummaryRow[] = []
): TenderCommandCentreData {
  return buildTenderCommandCentreData(projects, takeoffRows);
}
