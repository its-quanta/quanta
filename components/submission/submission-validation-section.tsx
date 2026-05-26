import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/src/lib/submission/validate-tender";
import type {
  TenderValidationResult,
  ValidationCategory,
} from "@/src/lib/submission/types";

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

type SubmissionValidationSectionProps = {
  validation: TenderValidationResult;
};

export function SubmissionValidationSection({
  validation,
}: SubmissionValidationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Validation checks</CardTitle>
        <CardDescription>
          Deterministic framework — no AI. {validation.checks.filter((c) => c.passed).length}{" "}
          of {validation.checks.length} checks passing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => {
          const checks = validation.checksByCategory[category];
          if (!checks.length) {
            return null;
          }
          const passed = checks.filter((check) => check.passed).length;

          return (
            <div key={category}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {CATEGORY_LABELS[category]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {passed}/{checks.length} pass
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {checks.map((check) => (
                  <li
                    key={check.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.detail}
                      </p>
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
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
