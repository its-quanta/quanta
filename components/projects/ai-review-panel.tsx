"use client";

import { AiReviewCanvas } from "@/components/ai-review/ai-review-canvas";
import { Badge } from "@/components/ui/badge";
import type {
  AiReviewItem,
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type AiReviewPanelProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  pricingItems: PricingItem[];
};

export function AiReviewPanel({
  projectId,
  items,
  documents,
  documentPages,
  takeoffItems,
  takeoffAssemblies,
  assemblyPackages,
  materialItems,
  labourItems,
  pricingItems,
}: AiReviewPanelProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">AI review</h2>
            <p className="text-sm text-muted-foreground">
              AI suggestions will appear here after document analysis is run.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-muted-foreground">
            Review
          </Badge>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            No AI suggestions to review
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Run analysis on your documents to generate draft suggestions. Quanta
            never adds lines to your live estimate until you approve them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">AI review</h2>
          <p className="text-sm text-muted-foreground">
            Evidence-backed approval on the drawing. Viewer-first workflow — no
            extraction or OCR in this release.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-muted-foreground">
          Review mode
        </Badge>
      </div>

      <AiReviewCanvas
        projectId={projectId}
        items={items}
        documents={documents}
        documentPages={documentPages}
        takeoffItems={takeoffItems}
        takeoffAssemblies={takeoffAssemblies}
        assemblyPackages={assemblyPackages}
        materialItems={materialItems}
        labourItems={labourItems}
        pricingItems={pricingItems}
      />
    </div>
  );
}
