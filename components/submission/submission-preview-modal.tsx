"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildTenderPackPreviewText } from "@/src/lib/submission/preview";
import type { SubmissionPreviewData } from "@/src/lib/submission/preview";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { OrganisationCurrency } from "@/src/types/database";
import type { Project, TenderClarification } from "@/src/types/database";

type SubmissionPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  preview: SubmissionPreviewData;
  clarifications: TenderClarification[];
  currency: OrganisationCurrency;
};

export function SubmissionPreviewModal({
  open,
  onOpenChange,
  project,
  preview,
  clarifications,
  currency,
}: SubmissionPreviewModalProps) {
  const text = buildTenderPackPreviewText({
    project,
    preview,
    clarifications,
    formatMoney: (value) => formatCurrency(value, currency),
    formatDate,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Tender pack preview</DialogTitle>
          <DialogDescription>
            Structured preview from saved project data. Not a PDF export.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words px-6 py-4 font-mono text-xs leading-relaxed text-foreground">
          {text}
        </pre>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
