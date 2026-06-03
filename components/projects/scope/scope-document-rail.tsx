"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import type { Document } from "@/src/types/database";

type ScopeDocumentRailProps = {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
};

export function ScopeDocumentRail({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: ScopeDocumentRailProps) {
  const supported = documents.filter(
    (doc) =>
      isPdfMimeType(doc.file_type) ||
      doc.file_type.startsWith("image/")
  );

  return (
    <aside className="flex min-h-0 w-[220px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <h3 className="text-base font-semibold">Documents</h3>
        <p className="text-sm text-muted-foreground">
          {supported.length} drawing{supported.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {supported.length === 0 ? (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            Upload PDF or image documents on the Documents tab first.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {supported.map((doc) => {
              const isSelected = doc.id === selectedDocumentId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onSelectDocument(doc.id)}
                    className={cn(
                      "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                      isSelected
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <p className="truncate text-xs font-medium text-foreground">
                      {doc.file_name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {isPdfMimeType(doc.file_type) ? "PDF" : "Image"}
                      </Badge>
                      {doc.page_count != null ? (
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {doc.page_count} pp
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
