import type { Project } from "@/src/types/database";
import { daysUntil } from "@/src/lib/format";

const ACTIVE_STATUSES = new Set(["draft", "in_review", "submitted"]);
const CLOSED_STATUSES = new Set(["won", "lost", "archived"]);

export type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
};

export type TenderInsight = {
  title: string;
  description: string;
  count: number;
  href?: string;
  emptyMessage: string;
};

export type DashboardStats = {
  metrics: DashboardMetric[];
  insights: TenderInsight[];
  recentProjects: Project[];
  hasProjects: boolean;
};

function sumEstimatedValue(projects: Project[]): number {
  return projects.reduce((total, project) => {
    return total + (project.estimated_value ?? 0);
  }, 0);
}

function isDueSoon(project: Project, withinDays = 14): boolean {
  if (!project.tender_due_date || CLOSED_STATUSES.has(project.status)) {
    return false;
  }

  const days = daysUntil(project.tender_due_date);
  return days !== null && days >= 0 && days <= withinDays;
}

function isOverdue(project: Project): boolean {
  if (!project.tender_due_date || CLOSED_STATUSES.has(project.status)) {
    return false;
  }

  const days = daysUntil(project.tender_due_date);
  return days !== null && days < 0;
}

function formatAverageMargin(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

export function buildDashboardStats(projects: Project[]): DashboardStats {
  const activeProjects = projects.filter((project) =>
    ACTIVE_STATUSES.has(project.status)
  );
  const draftTenders = projects.filter((project) => project.status === "draft");
  const dueSoon = projects.filter((project) => isDueSoon(project));
  const needingReview = projects.filter(
    (project) => project.status === "in_review"
  );
  const overdue = projects.filter((project) => isOverdue(project));
  const estimatedValue = sumEstimatedValue(activeProjects);

  // TODO: derive from takeoff_items once manual takeoff is built.
  const unreviewedTakeoffItems = 0;

  // TODO: derive from takeoff_draft_items and pricing review flags.
  const unreviewedItems = unreviewedTakeoffItems;

  // TODO: derive from material_lines and labour_lines completeness checks.
  const missingPricingItems = 0;

  // TODO: derive from tender_clarifications where type = rfi and status = open.
  const openRfis = 0;

  // TODO: derive from project_pricing_summary.margin_percent across active projects.
  const averageMargin: number | null = null;

  const metrics: DashboardMetric[] = [
    {
      label: "Active Projects",
      value: String(activeProjects.length),
      hint: "Draft, in review, or submitted",
    },
    {
      label: "Draft Tenders",
      value: String(draftTenders.length),
      hint: "Not yet sent for review",
    },
    {
      label: "Tenders Due Soon",
      value: String(dueSoon.length),
      hint: "Due within 14 days",
    },
    {
      label: "Unreviewed Items",
      value: unreviewedItems > 0 ? String(unreviewedItems) : "—",
      hint: "Takeoff and pricing lines awaiting review",
    },
    {
      label: "Estimated Tender Value",
      value:
        estimatedValue > 0
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              maximumFractionDigits: 0,
            }).format(estimatedValue)
          : "—",
      hint: "Active pipeline sell price total",
    },
    {
      label: "Average Margin",
      value: formatAverageMargin(averageMargin),
      hint: "Across active tenders",
    },
  ];

  const insights: TenderInsight[] = [
    {
      title: "Upcoming Deadlines",
      description: "Tenders with due dates in the next 14 days.",
      count: dueSoon.length,
      href: "/projects",
      emptyMessage: "No tender deadlines in the next 14 days.",
    },
    {
      title: "Projects Needing Review",
      description: "Tenders marked in review before submission.",
      count: needingReview.length,
      href: "/projects",
      emptyMessage: "No projects currently awaiting internal review.",
    },
    {
      title: "Missing Pricing Items",
      description: "Takeoff lines without material or labour build-up.",
      count: missingPricingItems,
      href: "/projects",
      emptyMessage: "Pricing completeness checks connect with materials and labour tables.",
    },
    {
      title: "Unreviewed Takeoff Items",
      description: "Quantity lines not yet verified.",
      count: unreviewedTakeoffItems,
      href: "/projects",
      emptyMessage: "Takeoff review counts connect with the takeoff table.",
    },
    {
      title: "Open RFIs / Clarifications",
      description: "Outstanding clarifications for active tenders.",
      count: openRfis,
      href: "/projects",
      emptyMessage: "RFI tracking connects with clarifications.",
    },
    {
      title: "Tender Risk Alerts",
      description: "Overdue deadlines on active tenders.",
      count: overdue.length,
      href: "/projects",
      emptyMessage: "No overdue tender deadlines on active projects.",
    },
  ];

  return {
    metrics,
    insights,
    recentProjects: projects.slice(0, 5),
    hasProjects: projects.length > 0,
  };
}
