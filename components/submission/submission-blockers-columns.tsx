"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildSubmissionActionHref } from "@/src/lib/submission/links";
import type { TenderValidationIssue } from "@/src/lib/submission/types";

type SubmissionBlockersColumnsProps = {
  projectId: string;
  critical: TenderValidationIssue[];
  warnings: TenderValidationIssue[];
};

function IssueColumn({
  projectId,
  title,
  description,
  issues,
  emptyMessage,
  accentClass,
}: {
  projectId: string;
  title: string;
  description: string;
  issues: TenderValidationIssue[];
  emptyMessage: string;
  accentClass: string;
}) {
  return (
    <Card size="sm" className={accentClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.slice(0, 6).map((issue) => (
              <li
                key={issue.id}
                className="rounded-md border border-border bg-background/80 px-2.5 py-2"
              >
                <p className="text-sm font-medium leading-snug">{issue.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {issue.description}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs"
                  asChild
                >
                  <Link href={buildSubmissionActionHref(projectId, issue.action)}>
                    {issue.action.label}
                  </Link>
                </Button>
              </li>
            ))}
            {issues.length > 6 ? (
              <li className="text-xs text-muted-foreground">
                +{issues.length - 6} more in validation details
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SubmissionBlockersColumns({
  projectId,
  critical,
  warnings,
}: SubmissionBlockersColumnsProps) {
  return (
    <div
      id="submission-issues"
      className="grid gap-4 md:grid-cols-2"
    >
      <IssueColumn
        projectId={projectId}
        title="Critical blockers"
        description="Must resolve before issue."
        issues={critical}
        emptyMessage="No critical blockers."
        accentClass="border-destructive/20"
      />
      <IssueColumn
        projectId={projectId}
        title="Warnings"
        description="Review before sending."
        issues={warnings}
        emptyMessage="No warnings."
        accentClass="border-amber-500/20"
      />
    </div>
  );
}
