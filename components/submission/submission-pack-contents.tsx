"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SubmissionPreviewData } from "@/src/lib/submission/preview";

type SubmissionPackContentsProps = {
  preview: SubmissionPreviewData;
};

export function SubmissionPackContents({ preview }: SubmissionPackContentsProps) {
  const included = preview.items.filter((item) => item.status === "included");

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Tender pack contents</CardTitle>
        <CardDescription className="text-xs">
          {included.length} of {preview.items.length} sections ready
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {preview.items.map((item) => (
            <li
              key={item.key}
              className={
                item.status === "included"
                  ? "text-foreground"
                  : "text-muted-foreground/70"
              }
            >
              {item.status === "included"
                ? "✓"
                : item.status === "needs_review"
                  ? "◐"
                  : "○"}{" "}
              {item.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
