import type { Project } from "@/src/types/database";
import { daysUntil } from "@/src/lib/format";

export type TenderRiskLevel = "none" | "low" | "medium" | "high" | "overdue";

export function deriveProjectRisk(
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
