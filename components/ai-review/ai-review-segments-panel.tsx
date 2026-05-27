"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import { AiReviewStatusBadge } from "@/components/ai-review/ai-review-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveAiReviewSegmentAction,
  fetchAiReviewSegmentsAction,
} from "@/src/lib/ai-review/actions";
import type { AiReviewSegment } from "@/src/lib/ai-review/segments";
import type { AiReviewItem } from "@/src/types/database";

type AiReviewSegmentsPanelProps = {
  item: AiReviewItem | null;
  projectId: string;
};

export function AiReviewSegmentsPanel({
  item,
  projectId,
}: AiReviewSegmentsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [segments, setSegments] = useState<AiReviewSegment[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSegmentId, setPendingSegmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setSegments([]);
      setLoadedForId(null);
      return;
    }

    let cancelled = false;
    setError(null);

    void fetchAiReviewSegmentsAction(item.id, projectId).then((result) => {
      if (cancelled) {
        return;
      }
      setSegments(result.segments);
      setLoadedForId(item.id);
    }).catch(() => {
      if (!cancelled) {
        setError("Could not load segments.");
        setSegments([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item, projectId]);

  if (!item) {
    return null;
  }

  const isLoaded = loadedForId === item.id;

  return (
    <Card className="border-dashed shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Segment approval</CardTitle>
        <CardDescription>
          Future-ready infrastructure for partial approvals on overlay segments.
          No segments are created until AI geometry extraction is enabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : !isLoaded ? (
          <p className="text-sm text-muted-foreground">Loading segments…</p>
        ) : segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No segments linked to this suggestion.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Trade</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment) => {
                  const rowPending =
                    isPending && pendingSegmentId === segment.id;
                  const canApprove =
                    segment.status === "pending" || segment.status === "adjusted";

                  return (
                    <TableRow key={segment.id}>
                      <TableCell className="text-sm">{segment.trade}</TableCell>
                      <TableCell className="text-sm">
                        {segment.label ?? segment.segment_key}
                      </TableCell>
                      <TableCell>
                        <AiReviewConfidenceBadge confidence={segment.confidence} />
                      </TableCell>
                      <TableCell>
                        <AiReviewStatusBadge status={segment.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canApprove || rowPending}
                          onClick={() => {
                            setError(null);
                            setPendingSegmentId(segment.id);
                            startTransition(async () => {
                              const result = await approveAiReviewSegmentAction(
                                segment.id,
                                projectId
                              );
                              setPendingSegmentId(null);
                              if (result.error) {
                                setError(result.error);
                                return;
                              }
                              router.refresh();
                              const refreshed = await fetchAiReviewSegmentsAction(
                                item.id,
                                projectId
                              );
                              setSegments(refreshed.segments);
                            });
                          }}
                        >
                          Approve segment
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
