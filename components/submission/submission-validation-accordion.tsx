"use client";

import { SubmissionCollapsible } from "@/components/submission/submission-collapsible";
import { Badge } from "@/components/ui/badge";
import type { TenderValidationResult, ValidationCheck } from "@/src/lib/submission/types";

type AccordionGroup = {
  id: string;
  title: string;
  categories: ValidationCheck["category"][];
};

const ACCORDION_GROUPS: AccordionGroup[] = [
  { id: "documents", title: "Documents", categories: ["document"] },
  { id: "takeoff", title: "Takeoff", categories: ["takeoff", "standards"] },
  { id: "methodologies", title: "Methodologies", categories: ["package"] },
  {
    id: "commercial",
    title: "Commercial",
    categories: ["pricing", "material", "labour"],
  },
  { id: "submission", title: "Submission", categories: ["submission"] },
];

type SubmissionValidationAccordionProps = {
  validation: TenderValidationResult;
};

function CheckRow({ check }: { check: ValidationCheck }) {
  return (
    <li className="flex items-start justify-between gap-2 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{check.label}</p>
        <p className="text-xs text-muted-foreground">{check.detail}</p>
      </div>
      <Badge
        variant="outline"
        className={
          check.passed
            ? "shrink-0 border-emerald-500/50 text-emerald-800"
            : check.severityOnFail === "critical"
              ? "shrink-0 border-destructive/50 text-destructive"
              : check.severityOnFail === "warning"
                ? "shrink-0 border-amber-500/50 text-amber-900"
                : "shrink-0 border-primary/40 text-primary"
        }
      >
        {check.passed ? "Pass" : "Fail"}
      </Badge>
    </li>
  );
}

export function SubmissionValidationAccordion({
  validation,
}: SubmissionValidationAccordionProps) {
  const passedTotal = validation.checks.filter((c) => c.passed).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {passedTotal}/{validation.checks.length} checks passing · expand for full
        framework
      </p>
      {ACCORDION_GROUPS.map((group) => {
        const checks = validation.checks.filter((check) =>
          group.categories.includes(check.category)
        );
        if (checks.length === 0) {
          return null;
        }
        const passed = checks.filter((c) => c.passed).length;
        const failed = checks.length - passed;

        return (
          <SubmissionCollapsible
            key={group.id}
            title={group.title}
            summary={`${passed}/${checks.length} pass${failed > 0 ? ` · ${failed} fail` : ""}`}
            defaultOpen={false}
          >
            <ul className="divide-y divide-border">
              {checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </ul>
          </SubmissionCollapsible>
        );
      })}
    </div>
  );
}
