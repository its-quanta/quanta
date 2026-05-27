"use client";

import { useEffect, useState } from "react";

import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import { AiReviewStatusBadge } from "@/components/ai-review/ai-review-status-badge";
import { Separator } from "@/components/ui/separator";
import {
  AI_REVIEW_APPROVAL_ACTION_LABELS,
  type AiReviewApprovalEvent,
} from "@/src/lib/ai-review/approval-history";
import { fetchAiReviewApprovalHistoryAction } from "@/src/lib/ai-review/actions";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type { AiReviewItem, Document, DocumentPage } from "@/src/types/database";

type AiReviewEvidencePanelProps = {
  item: AiReviewItem;
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
};

function formatEventTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AiReviewEvidencePanel({
  item,
  projectId,
  documents,
  documentPages,
}: AiReviewEvidencePanelProps) {
  const [history, setHistory] = useState<AiReviewApprovalEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const context = buildDrawingReferenceContext(documents, documentPages);
  const documentName = item.source_document_id
    ? context.documentNames.get(item.source_document_id) ?? "—"
    : "—";

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void fetchAiReviewApprovalHistoryAction(item.id, projectId).then((result) => {
      if (cancelled) {
        return;
      }
      setHistory(result.events);
      setHistoryLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setHistoryError("Could not load approval history.");
        setHistoryLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item.id, projectId]);

  const hasEvidence =
    Boolean(item.source_document_id) ||
    Boolean(item.drawing_reference) ||
    Boolean(item.reasoning);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Evidence
        </p>
        {!hasEvidence ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No linked evidence yet. When AI suggestions include document references,
            they will appear here for review.
          </p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Document</dt>
              <dd className="mt-0.5">{documentName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Drawing</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {item.drawing_reference ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Page</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {item.page_number ?? "—"}
                {item.sheet_number ? ` · ${item.sheet_number}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reference</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {[item.drawing_reference, item.sheet_number]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Confidence</dt>
              <dd className="mt-1">
                <AiReviewConfidenceBadge confidence={item.confidence} />
              </dd>
            </div>
          </dl>
        )}
      </div>

      {item.reasoning ? (
        <div className="rounded-md border border-border bg-muted/20 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reasoning
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {item.reasoning}
          </p>
        </div>
      ) : null}

      <Separator />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Approval history
        </p>
        {historyLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : historyError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {historyError}
          </p>
        ) : history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No approval events recorded yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((event) => (
              <li
                key={event.id}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {AI_REVIEW_APPROVAL_ACTION_LABELS[event.action]}
                  </span>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={event.created_at}
                  >
                    {formatEventTime(event.created_at)}
                  </time>
                </div>
                {event.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>
                ) : null}
                {event.ai_review_segment_id ? (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Segment {event.ai_review_segment_id.slice(0, 8)}…
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Current status</span>
        <AiReviewStatusBadge status={item.status} />
      </div>
    </div>
  );
}
