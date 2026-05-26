"use client";

import { useMemo } from "react";

import { AiReviewSummaryCards } from "@/components/ai-review/ai-review-summary";
import { AiReviewTable } from "@/components/ai-review/ai-review-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeAiReviewSummary } from "@/src/lib/ai-review/summary";
import type { ScopeGapSummary } from "@/src/lib/scope-gaps/types";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type AiReviewPanelProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  scopeGapSummary: ScopeGapSummary;
};

export function AiReviewPanel({
  projectId,
  items,
  documents,
  documentPages,
  scopeGapSummary,
}: AiReviewPanelProps) {
  const summary = useMemo(() => computeAiReviewSummary(items), [items]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">AI review</h2>
          <p className="text-sm text-muted-foreground">
            Review AI takeoff suggestions before they enter your live estimate.
            No extraction runs in this release — queue only.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-muted-foreground">
          Review desk · infrastructure
        </Badge>
      </div>

      <AiReviewSummaryCards
        summary={summary}
        scopeGapsIdentified={scopeGapSummary.totalGaps}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI suggestions</CardTitle>
          <CardDescription>
            Accept to add a takeoff line, reject to dismiss, or adjust before
            accepting. Reasoning is stored for traceability when AI is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiReviewTable
            projectId={projectId}
            items={items}
            documents={documents}
            documentPages={documentPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
