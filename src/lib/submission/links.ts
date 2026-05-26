import type { TenderValidationAction } from "@/src/lib/submission/types";

export function buildSubmissionActionHref(
  projectId: string,
  action: Pick<TenderValidationAction, "tab" | "priceTakeoff" | "section">
): string {
  const params = new URLSearchParams();
  params.set("tab", action.tab);
  if (action.priceTakeoff) {
    params.set("priceTakeoff", action.priceTakeoff);
  }
  if (action.section) {
    params.set("section", action.section);
  }
  return `/projects/${projectId}?${params.toString()}`;
}
