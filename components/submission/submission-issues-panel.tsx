"use client";

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
import type { TenderValidationIssue } from "@/src/lib/submission/types";

type SubmissionIssuesPanelProps = {
  projectId: string;
  issues: TenderValidationIssue[];
};

export function SubmissionIssuesPanel({
  projectId,
  issues,
}: SubmissionIssuesPanelProps) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  const ordered = [...critical, ...warnings, ...infos].slice(0, 8);
  const remaining = issues.length - ordered.length;

  return (
    <Card id="submission-issues">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Issues</CardTitle>
        <CardDescription>
          {issues.length === 0
            ? "No open issues — review the preview before issue."
            : `${critical.length} critical · ${warnings.length} warning · ${infos.length} info`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">All checks passing.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ordered.map((issue) => (
              <li
                key={issue.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SubmissionSeverityBadge severity={issue.severity} />
                    <span className="text-sm font-medium leading-tight">
                      {issue.title}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {issue.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  asChild
                >
                  <Link href={buildSubmissionActionHref(projectId, issue.action)}>
                    Fix
                  </Link>
                </Button>
              </li>
            ))}
            {remaining > 0 ? (
              <li className="text-xs text-muted-foreground">
                +{remaining} more in validation checks below
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
