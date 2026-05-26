"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCOPE_GAP_LABELS } from "@/src/lib/scope-gaps/constants";
import type { ProjectReadinessMetrics } from "@/src/lib/projects/readiness";
import type { ScopeGapSummary } from "@/src/lib/scope-gaps/types";

type SubmissionPanelProps = {
  readiness: ProjectReadinessMetrics;
  scopeGapSummary: ScopeGapSummary;
};

type ReadinessCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

function ReadinessCheckRow({ check }: { check: ReadinessCheck }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{check.label}</p>
        <p className="text-xs text-muted-foreground">{check.detail}</p>
      </div>
      <Badge
        variant="outline"
        className={
          check.passed
            ? "border-emerald-500/50 text-emerald-800"
            : "border-amber-500/50 text-amber-900"
        }
      >
        {check.passed ? "Pass" : "Outstanding"}
      </Badge>
    </li>
  );
}

export function SubmissionPanel({
  readiness,
  scopeGapSummary,
}: SubmissionPanelProps) {
  const byKind = scopeGapSummary.byKind;

  const checks: ReadinessCheck[] = [
    {
      label: "Pricing complete",
      passed:
        readiness.pricingCoveragePercent === 100 &&
        readiness.priceableTakeoffItems > 0,
      detail: `${readiness.pricedItems} of ${readiness.priceableTakeoffItems} lines priced`,
    },
    {
      label: "No missing package",
      passed: byKind.missing_package === 0,
      detail:
        byKind.missing_package === 0
          ? "All priceable lines have methodology applied"
          : `${byKind.missing_package} lines without package`,
    },
    {
      label: "No missing pricing",
      passed: byKind.missing_pricing === 0,
      detail:
        byKind.missing_pricing === 0
          ? "Every line has a pricing record"
          : `${byKind.missing_pricing} unpriced lines`,
    },
    {
      label: "No missing labour",
      passed: byKind.missing_labour_generation === 0,
      detail:
        byKind.missing_labour_generation === 0
          ? "Labour generated where packages apply"
          : `${byKind.missing_labour_generation} lines need labour`,
    },
    {
      label: "No missing materials",
      passed: byKind.missing_material_generation === 0,
      detail:
        byKind.missing_material_generation === 0
          ? "Materials generated where packages apply"
          : `${byKind.missing_material_generation} lines need materials`,
    },
    {
      label: "Standards linked",
      passed: byKind.missing_standards_reference === 0,
      detail:
        byKind.missing_standards_reference === 0
          ? "Standards referenced on takeoff lines"
          : `${byKind.missing_standards_reference} lines without standards`,
    },
    {
      label: "Exclusions complete",
      passed: false,
      detail:
        "Clarifications (exclusions, assumptions, RFIs) connect in a later phase.",
    },
  ];

  const readyToSubmit =
    readiness.readyForSubmission &&
    checks.filter((c) => c.label !== "Exclusions complete").every((c) => c.passed);

  return (
    <div className="flex flex-col gap-8">
      <Card
        className={
          readyToSubmit ? "border-emerald-500/40" : "border-amber-500/40"
        }
      >
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Tender readiness</CardTitle>
              <CardDescription>
                Final checks before export and submission.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                readyToSubmit
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-900"
              }
            >
              Ready to submit: {readyToSubmit ? "Yes" : "No"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {checks.map((check) => (
              <ReadinessCheckRow key={check.label} check={check} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exclusions</CardTitle>
            <CardDescription>
              Qualifications to exclude from your tender scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Record exclusions when clarifications are enabled. Review scope
              gaps: {SCOPE_GAP_LABELS.missing_package.toLowerCase()} and pricing
              should be resolved first.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assumptions</CardTitle>
            <CardDescription>
              Conditions assumed in your pricing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Assumptions will appear here alongside exclusions and RFIs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">RFIs</CardTitle>
            <CardDescription>
              Requests for information to the principal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track open RFIs before submission when clarifications are enabled.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export</CardTitle>
          <CardDescription>
            Export reflects saved data as of now. Excel export connects in a
            later phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete pricing and scope review before exporting your tender pack.
            No export changes in this release — controls remain placeholder until
            M6 export is wired.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
