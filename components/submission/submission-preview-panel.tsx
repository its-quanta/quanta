"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PackItemStatusBadge } from "@/components/submission/pack-item-status-badge";
import type { SubmissionPreviewData } from "@/src/lib/submission/preview";
import { cn } from "@/lib/utils";

type SubmissionPreviewPanelProps = {
  preview: SubmissionPreviewData;
  onPreviewTender: () => void;
};

export function SubmissionPreviewPanel({
  preview,
  onPreviewTender,
}: SubmissionPreviewPanelProps) {
  return (
    <Card id="submission-preview">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Submission preview</CardTitle>
            <CardDescription>
              Tender pack contents from saved project data.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onPreviewTender}>
              Preview tender
            </Button>
            <Button type="button" size="sm" variant="outline" disabled title="Export connects in M6">
              Generate tender pack
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1.5">
          {preview.items.map((item) => (
            <li
              key={item.key}
              className={cn(
                "flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                item.status === "included" && "bg-muted/20",
                item.status === "missing" && "bg-destructive/5",
                item.status === "needs_review" && "bg-amber-500/5"
              )}
            >
              <div className="min-w-0">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <PackItemStatusBadge status={item.status} />
            </li>
          ))}
        </ul>

        {preview.items.some((m) => m.status === "missing") ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-xs font-medium text-amber-900">Missing from pack</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {preview.items
                .filter((m) => m.status === "missing")
                .map((m) => m.label)
                .join(" · ")}
            </p>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Page estimate</dt>
            <dd className="mt-0.5 font-mono tabular-nums">~{preview.pageEstimate} pp</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">File estimate</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              ~{preview.fileEstimate} files
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          Estimates based on line counts and documents. Export not enabled in this
          release.
        </p>
      </CardContent>
    </Card>
  );
}
