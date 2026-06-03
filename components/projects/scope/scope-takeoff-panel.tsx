"use client";

import { ProjectTakeoffPanel } from "@/components/takeoff/project-takeoff-panel";
import type {
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ScopeTakeoffPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  assemblyPackages: AssemblyPackage[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  onPriceManual?: (takeoffItemId: string) => void;
};

export function ScopeTakeoffPanel({
  projectId,
  documents,
  documentPages,
  takeoffItems,
  assemblyPackages,
  takeoffAssemblies,
  pricingItems,
  organisationStandards,
  projectStandardLinks,
  onPriceManual,
}: ScopeTakeoffPanelProps) {
  const lineCount = takeoffItems.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <h2 className="text-xl font-semibold tracking-tight">Takeoff</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Accepted quantity lines only — edit, link drawings, and apply
          packages before estimate and commercial.
        </p>
        <p className="mt-2 text-base font-medium tabular-nums text-foreground">
          {lineCount} live line{lineCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ProjectTakeoffPanel
          projectId={projectId}
          items={takeoffItems}
          documents={documents}
          documentPages={documentPages}
          assemblyPackages={assemblyPackages}
          takeoffAssemblies={takeoffAssemblies}
          pricingItems={pricingItems}
          organisationStandards={organisationStandards}
          projectStandardLinks={projectStandardLinks}
          onPriceManual={onPriceManual}
          showWorkflowFilter
          compact
          virtualized
          embedded
        />
      </div>
    </div>
  );
}
