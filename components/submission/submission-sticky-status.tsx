"use client";

import { Button } from "@/components/ui/button";
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

type SubmissionStickyStatusProps = {
  validation: TenderValidationResult;
  onPreviewPack: () => void;
};

export function SubmissionStickyStatus({
  validation,
  onPreviewPack,
}: SubmissionStickyStatusProps) {
  const isReady = validation.readinessStatus === "ready";

  return (
    <div className="sticky top-4 z-10">
      <Card
        className={cn(
          "shadow-md",
          isReady ? "border-emerald-500/40" : "border-border"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">Submission status</CardTitle>
            <Badge
              variant="outline"
              className={
                isReady
                  ? "border-emerald-500/50 text-emerald-800"
                  : "border-destructive/50 text-destructive"
              }
            >
              {isReady ? "Ready" : "Not ready"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Final gate before tender issue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {validation.readinessScore}%
          </p>
          {!isReady && validation.blockReasons.length > 0 ? (
            <ul className="max-h-24 overflow-y-auto text-xs text-muted-foreground">
              {validation.blockReasons.map((reason) => (
                <li key={reason} className="py-0.5">
                  · {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              All mandatory gates passed.
            </p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" onClick={onPreviewPack}>
              Preview tender pack
            </Button>
            <Button
              type="button"
              size="sm"
              disabled
              title="Export connects in a later release"
            >
              Generate pack
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
