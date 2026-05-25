"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityStandardsSection } from "@/components/standards/entity-standards-section";
import type {
  Standard,
  StandardLinkEntityType,
  StandardLinkWithStandard,
} from "@/src/types/database";

type LinkStandardsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: StandardLinkEntityType;
  entityId: string;
  entityLabel: string;
  projectId?: string | null;
  links: StandardLinkWithStandard[];
  availableStandards: Standard[];
};

export function LinkStandardsDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
  projectId = null,
  links,
  availableStandards,
}: LinkStandardsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link standards</DialogTitle>
          <DialogDescription>
            Attach reference codes to {entityLabel}.
          </DialogDescription>
        </DialogHeader>
        <EntityStandardsSection
          entityType={entityType}
          entityId={entityId}
          entityLabel={entityLabel}
          projectId={projectId}
          initialLinks={links}
          availableStandards={availableStandards}
        />
      </DialogContent>
    </Dialog>
  );
}
