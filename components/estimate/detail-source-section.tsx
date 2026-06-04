"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Document, TakeoffItem } from "@/src/types/database";

type DetailSourceSectionProps = {
  takeoffItem: TakeoffItem;
  documents: Document[];
  onViewInScope?: () => void;
  className?: string;
};

export function DetailSourceSection({
  takeoffItem,
  documents,
  onViewInScope,
  className,
}: DetailSourceSectionProps) {
  const documentName = useMemo(() => {
    if (!takeoffItem.source_document_id) {
      return null;
    }
    const doc = documents.find((row) => row.id === takeoffItem.source_document_id);
    return doc?.file_name ?? "Unknown document";
  }, [documents, takeoffItem.source_document_id]);

  const hasSource =
    documentName ||
    takeoffItem.drawing_reference ||
    takeoffItem.sheet_number ||
    takeoffItem.page_number != null ||
    takeoffItem.specification_reference;

  return (
    <div className={cn("space-y-3", className)}>
      {!hasSource ? (
        <p className="text-sm text-muted-foreground">
          No drawing reference (manually created item).
        </p>
      ) : (
        <dl className="grid gap-2 text-sm">
          <SourceRow label="Document" value={documentName} />
          <SourceRow
            label="Drawing ref"
            value={takeoffItem.drawing_reference}
          />
          <SourceRow label="Sheet" value={takeoffItem.sheet_number} />
          <SourceRow
            label="Page"
            value={
              takeoffItem.page_number != null
                ? String(takeoffItem.page_number)
                : null
            }
          />
          <SourceRow
            label="Specification"
            value={takeoffItem.specification_reference}
          />
        </dl>
      )}

      {onViewInScope ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={onViewInScope}
        >
          View in Scope ↗
        </Button>
      ) : null}
    </div>
  );
}

function SourceRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[14rem] truncate text-right">{value?.trim() || "—"}</dd>
    </div>
  );
}
