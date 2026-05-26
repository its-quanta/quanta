import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TenderValidationResult } from "@/src/lib/submission/types";
import { cn } from "@/lib/utils";

type SubmissionReadinessCardProps = {
  validation: TenderValidationResult;
};

export function SubmissionReadinessCard({
  validation,
}: SubmissionReadinessCardProps) {
  const isReady = validation.readinessStatus === "ready";

  return (
    <Card
      className={cn(
        isReady ? "border-emerald-500/40" : "border-amber-500/40"
      )}
    >
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Tender readiness</CardTitle>
            <CardDescription>
              Commercial and technical checks before tender issue.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "w-fit",
              isReady
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                : "border-amber-500/50 bg-amber-500/10 text-amber-900"
            )}
          >
            {validation.readinessLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p
            className={cn(
              "font-mono text-5xl font-semibold tabular-nums tracking-tight",
              isReady ? "text-emerald-700" : "text-foreground"
            )}
          >
            {validation.readinessScore}%
          </p>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Critical</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-destructive">
                {validation.criticalCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Warnings</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-amber-800">
                {validation.warningCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Info</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-primary">
                {validation.infoCount}
              </dd>
            </div>
          </dl>
        </div>
        {!isReady && validation.blockReasons.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm text-muted-foreground">
            {validation.blockReasons.map((reason) => (
              <li key={reason}>· {reason}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
