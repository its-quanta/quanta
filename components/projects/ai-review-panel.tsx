"use client";

import { ScopeWorkspace } from "@/components/scope/scope-workspace";
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
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScopeWorkspace
        projectId={projectId}
        aiReviewItems={items}
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
