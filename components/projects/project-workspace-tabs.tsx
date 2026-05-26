"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CommercialReviewPanel } from "@/components/projects/commercial-review-panel";
import { ProjectOverviewPanel } from "@/components/projects/project-overview-panel";
import { ScopeReviewPanel } from "@/components/projects/scope-review-panel";
import { SubmissionPanel } from "@/components/projects/submission-panel";
import { TenderInputsPanel } from "@/components/projects/tender-inputs-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeProjectReadiness } from "@/src/lib/projects/readiness";
import {
  isWorkspaceTab,
  resolveWorkspaceTab,
} from "@/src/lib/projects/tab-routing";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type { ScopeGapSummary, WorkspaceTabValue } from "@/src/lib/scope-gaps/types";
import type {
  AssemblyPackage,
  ClarificationTemplate,
  Document,
  DocumentPage,
  PricingItem,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  Standard,
  StandardLink,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

const workspaceTabs = [
  { value: "overview", label: "Overview" },
  { value: "tender-inputs", label: "Tender Inputs" },
  { value: "scope-review", label: "Scope Review" },
  { value: "commercial-review", label: "Commercial Review" },
  { value: "submission", label: "Submission" },
] as const;

type ProjectWorkspaceTabsProps = {
  project: Project;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItemWithTakeoff[];
  assemblyPackages: AssemblyPackage[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItemsPlain: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  estimateLoadError: string | null;
  scopeGapSummary: ScopeGapSummary;
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  standardLinks: StandardLink[];
  clarifications: TenderClarification[];
  clarificationTemplates: ClarificationTemplate[];
};

export function ProjectWorkspaceTabs({
  project,
  documents,
  documentPages,
  takeoffItems,
  pricingItems,
  assemblyPackages,
  takeoffAssemblies,
  pricingItemsPlain,
  materialItems,
  labourItems,
  estimateLoadError,
  scopeGapSummary,
  organisationStandards,
  projectStandardLinks,
  standardLinks,
  clarifications,
  clarificationTemplates,
}: ProjectWorkspaceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const priceTakeoffParam = searchParams.get("priceTakeoff");

  const [activeTab, setActiveTab] = useState<WorkspaceTabValue>(() =>
    resolveWorkspaceTab(tabParam)
  );
  const [pricingTakeoffId, setPricingTakeoffId] = useState<string | null>(null);

  const readiness = useMemo(
    () =>
      computeProjectReadiness({
        documents,
        takeoffItems,
        pricingItems: pricingItemsPlain,
        takeoffAssemblies,
        materialItems,
        labourItems,
        standardLinks,
        clarifications,
        scopeGapsTotal: scopeGapSummary.totalGaps,
      }),
    [
      documents,
      takeoffItems,
      pricingItemsPlain,
      takeoffAssemblies,
      materialItems,
      labourItems,
      standardLinks,
      clarifications,
      scopeGapSummary.totalGaps,
    ]
  );

  useEffect(() => {
    setActiveTab(resolveWorkspaceTab(tabParam));
  }, [tabParam]);

  useEffect(() => {
    if (priceTakeoffParam) {
      setActiveTab("commercial-review");
      setPricingTakeoffId(priceTakeoffParam);
    }
  }, [priceTakeoffParam]);

  const navigateTab = useCallback(
    (tab: WorkspaceTabValue, options?: { priceTakeoff?: string }) => {
      setActiveTab(tab);
      const params = new URLSearchParams();
      if (tab !== "overview") {
        params.set("tab", tab);
      }
      if (options?.priceTakeoff) {
        params.set("priceTakeoff", options.priceTakeoff);
      }
      const query = params.toString();
      router.replace(
        query ? `/projects/${project.id}?${query}` : `/projects/${project.id}`,
        { scroll: false }
      );
    },
    [project.id, router]
  );

  function handleScopeGapNavigate(tab: string, takeoffId?: string) {
    if (!isWorkspaceTab(tab)) {
      const resolved = resolveWorkspaceTab(tab);
      if (takeoffId && resolved === "commercial-review") {
        navigateTab(resolved, { priceTakeoff: takeoffId });
        return;
      }
      navigateTab(resolved);
      return;
    }

    if (tab === "commercial-review" && takeoffId) {
      navigateTab(tab, { priceTakeoff: takeoffId });
      return;
    }

    navigateTab(tab);
  }

  function handlePriceManual(takeoffItemId: string) {
    setPricingTakeoffId(takeoffItemId);
    navigateTab("commercial-review", { priceTakeoff: takeoffItemId });
  }

  function clearPricingTakeoffParam() {
    setPricingTakeoffId(null);
    navigateTab("commercial-review");
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (isWorkspaceTab(value)) {
          navigateTab(value);
        }
      }}
      className="gap-4"
    >
      <TabsList
        variant="line"
        className="h-auto w-full flex-wrap justify-start gap-1"
      >
        {workspaceTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <ProjectOverviewPanel
          project={project}
          readiness={readiness}
          scopeGapSummary={scopeGapSummary}
          onNavigateTab={(tab, takeoffId) => {
            if (takeoffId && tab === "commercial-review") {
              navigateTab(tab, { priceTakeoff: takeoffId });
              return;
            }
            navigateTab(tab);
          }}
        />
      </TabsContent>

      <TabsContent value="tender-inputs">
        <TenderInputsPanel
          projectId={project.id}
          documents={documents}
          documentPages={documentPages}
          takeoffItems={takeoffItems}
          assemblyPackages={assemblyPackages}
          takeoffAssemblies={takeoffAssemblies}
          pricingItems={pricingItemsPlain}
          organisationStandards={organisationStandards}
          projectStandardLinks={projectStandardLinks}
          onPriceManual={handlePriceManual}
        />
      </TabsContent>

      <TabsContent value="scope-review">
        <ScopeReviewPanel
          projectId={project.id}
          documents={documents}
          documentPages={documentPages}
          takeoffItems={takeoffItems}
          takeoffAssemblies={takeoffAssemblies}
          pricingItems={pricingItems}
          pricingItemsPlain={pricingItemsPlain}
          materialItems={materialItems}
          labourItems={labourItems}
          assemblyPackages={assemblyPackages}
          organisationStandards={organisationStandards}
          projectStandardLinks={projectStandardLinks}
          standardLinks={standardLinks}
          estimateLoadError={estimateLoadError}
          onNavigateTab={(tab, takeoffId) => {
            if (takeoffId && tab === "commercial-review") {
              navigateTab(tab, { priceTakeoff: takeoffId });
              return;
            }
            navigateTab(tab);
          }}
          pricingTakeoffId={
            activeTab === "scope-review" ? pricingTakeoffId : null
          }
          onPricingTakeoffConsumed={clearPricingTakeoffParam}
        />
      </TabsContent>

      <TabsContent value="commercial-review">
        <CommercialReviewPanel
          project={project}
          projectId={project.id}
          pricingItems={pricingItems}
          takeoffItems={takeoffItems}
          takeoffAssemblies={takeoffAssemblies}
          assemblyPackages={assemblyPackages}
          pricingItemsPlain={pricingItemsPlain}
          materialItems={materialItems}
          labourItems={labourItems}
          organisationStandards={organisationStandards}
          projectStandardLinks={projectStandardLinks}
          scopeGapsTotal={scopeGapSummary.totalGaps}
          exclusionsDraftedPercent={readiness.exclusionsDraftedPercent}
          pricingTakeoffId={pricingTakeoffId}
          onPricingTakeoffConsumed={clearPricingTakeoffParam}
        />
      </TabsContent>

      <TabsContent value="submission">
        <SubmissionPanel
          project={project}
          projectId={project.id}
          documents={documents}
          takeoffItems={takeoffItems}
          pricingItems={pricingItems}
          takeoffAssemblies={takeoffAssemblies}
          materialItems={materialItems}
          labourItems={labourItems}
          standardLinks={standardLinks}
          clarifications={clarifications}
          templates={clarificationTemplates}
        />
      </TabsContent>
    </Tabs>
  );
}
