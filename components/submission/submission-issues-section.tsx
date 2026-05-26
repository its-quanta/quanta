import Link from "next/link";

import { SubmissionSeverityBadge } from "@/components/submission/submission-severity-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildSubmissionActionHref } from "@/src/lib/submission/links";
import type {
  TenderValidationIssue,
  ValidationSeverity,
} from "@/src/lib/submission/types";

type SubmissionIssuesSectionProps = {
  projectId: string;
  title: string;
  description: string;
  issues: TenderValidationIssue[];
  severity: ValidationSeverity;
  emptyMessage: string;
};

export function SubmissionIssuesSection({
  projectId,
  title,
  description,
  issues,
  severity,
  emptyMessage,
}: SubmissionIssuesSectionProps) {
  const filtered = issues.filter((issue) => issue.severity === severity);

  return (
    <Card id={severity === "critical" ? "critical-issues" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SubmissionSeverityBadge severity={issue.severity} />
                    <p className="text-sm font-medium">{issue.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {issue.description}
                  </p>
                  {issue.relatedItem ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {issue.relatedItem}
                    </p>
                  ) : null}
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link href={buildSubmissionActionHref(projectId, issue.action)}>
                    {issue.action.label}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
