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

type SubmissionTenderPackPanelProps = {
  preview: SubmissionPreviewData;
  onPreviewPack: () => void;
};

export function SubmissionTenderPackPanel({
  preview,
  onPreviewPack,
}: SubmissionTenderPackPanelProps) {
  return (
    <Card id="submission-preview">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Tender pack preview</CardTitle>
            <CardDescription className="text-xs">
              Sections included in your issue pack from saved data.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={onPreviewPack}
          >
            Preview tender pack
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1">
          {preview.items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <PackItemStatusBadge status={item.status} />
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Page estimate</dt>
            <dd className="font-mono tabular-nums">~{preview.pageEstimate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Section estimate</dt>
            <dd className="font-mono tabular-nums">~{preview.fileEstimate}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
