"use client";

import { ScopeReviewPanel } from "@/components/projects/scope-review-panel";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";
import type {
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  Standard,
  StandardLink,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type BuildUpPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItemWithTakeoff[];
  pricingItemsPlain: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  assemblyPackages: AssemblyPackage[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  standardLinks: StandardLink[];
  estimateLoadError: string | null;
  onNavigateTab: (tab: WorkspaceTabValue, takeoffId?: string) => void;
  pricingTakeoffId?: string | null;
  onPricingTakeoffConsumed?: () => void;
};

export function BuildUpPanel(props: BuildUpPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Estimate</h2>
        <p className="text-sm text-muted-foreground">
          Review packages, generated materials, and labour before commercial
          pricing and submission.
        </p>
      </div>
      <ScopeReviewPanel {...props} />
    </div>
  );
}
