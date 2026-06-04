"use client";

import { EstimateWorkspace } from "@/components/estimate/estimate-workspace";
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

export type BuildUpPanelProps = {
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
  return <EstimateWorkspace {...props} />;
}
