"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCOPE_GAP_LABELS } from "@/src/lib/scope-gaps/constants";
import type { ScopeGap, ScopeGapKind } from "@/src/lib/scope-gaps/types";

type ProjectScopeGapsCardProps = {
  projectId: string;
  totalGaps: number;
  byKind: Record<ScopeGapKind, number>;
  gaps: ScopeGap[];
  onNavigateTab?: (tab: string, takeoffId?: string) => void;
};

export function ProjectScopeGapsCard({
  projectId,
  totalGaps,
  byKind,
  gaps,
  onNavigateTab,
}: ProjectScopeGapsCardProps) {
  const preview = gaps.slice(0, 8);

  return (
    <Card className={totalGaps > 0 ? "border-amber-500/40" : undefined}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Scope gaps</CardTitle>
            <CardDescription>
              Incomplete package, pricing, generation, drawing, or standards
              links on takeoff lines.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              totalGaps > 0
                ? "border-amber-500/50 bg-amber-500/10 text-amber-900"
                : "bg-emerald-500/10 text-emerald-800"
            }
          >
            {totalGaps > 0 ? `${totalGaps} outstanding` : "Complete"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {totalGaps === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scope gaps detected on priceable takeoff lines.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(byKind) as ScopeGapKind[])
                .filter((kind) => byKind[kind] > 0)
                .map((kind) => (
                  <Badge key={kind} variant="outline" className="text-amber-900">
                    {SCOPE_GAP_LABELS[kind]}: {byKind[kind]}
                  </Badge>
                ))}
            </div>

            <ul className="flex flex-col gap-2">
              {preview.map((gap) => (
                <li
                  key={gap.id}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {gap.takeoff_item_name}
                        <span className="text-muted-foreground">
                          {" "}
                          · {gap.trade}
                        </span>
                      </p>
                      <p className="text-xs text-amber-900 dark:text-amber-200">
                        {gap.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {gap.detail}
                      </p>
                    </div>
                    {gap.fix_tab && onNavigateTab ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onNavigateTab(gap.fix_tab!, gap.takeoff_item_id)
                        }
                      >
                        Resolve
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {gaps.length > preview.length ? (
              <p className="text-xs text-muted-foreground">
                +{gaps.length - preview.length} more gap
                {gaps.length - preview.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          <Link href="/standards" className="text-primary hover:underline">
            Manage standards
          </Link>{" "}
          to resolve missing reference gaps.
        </p>
      </CardContent>
    </Card>
  );
}
