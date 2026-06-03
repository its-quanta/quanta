"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useGlobalCommand } from "@/components/command-palette/global-command-provider";
import { TakeoffRelationshipsProvider } from "@/components/takeoff/takeoff-relationships-context";
import { buildProjectCommandIndex } from "@/src/lib/command/build-project-index";
import { AiReviewPanel } from "@/components/projects/ai-review-panel";
import { BuildUpPanel } from "@/components/projects/build-up-panel";
import { CommercialReviewPanel } from "@/components/projects/commercial-review-panel";
import { PlansSpecsPanel } from "@/components/projects/plans-specs-panel";
import { ProjectOverviewPanel } from "@/components/projects/project-overview-panel";
import { ProjectWorkflowProgressBar } from "@/components/projects/project-workflow-progress-bar";
import { SubmissionPanel } from "@/components/projects/submission-panel";
import { TakeoffTabPanel } from "@/components/projects/takeoff-tab-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeProjectReadiness } from "@/src/lib/projects/readiness";
import { computeWorkspaceSteps } from "@/src/lib/projects/workspace-steps";
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
  AiReviewItem,
} from "@/src/types/database";

const workspaceTabs = [
  { value: "overview", label: "Overview" },
  { value: "plans-specs", label: "Plans & Specs" },
  { value: "ai-review", label: "AI Review" },
  { value: "takeoff", label: "Takeoff" },
  { value: "build-up", label: "Build Up" },
  { value: "commercial", label: "Commercial" },
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
  aiReviewItems: AiReviewItem[];
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
  aiReviewItems,
}: ProjectWorkspaceTabsProps) {
  const router = useRouter();
  const { setWorkspaceContext } = useGlobalCommand();
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

  const workflowSteps = useMemo(
    () =>
      computeWorkspaceSteps({
        documentsCount: documents.length,
        aiReviewItems,
        readiness,
        submissionReady: readiness.readyForSubmission,
        scopeGapsTotal: scopeGapSummary.totalGaps,
        scopeGapsByKind: scopeGapSummary.byKind,
      }),
    [documents.length, aiReviewItems, readiness, scopeGapSummary.byKind, scopeGapSummary.totalGaps]
  );

  useEffect(() => {
    setActiveTab(resolveWorkspaceTab(tabParam));
  }, [tabParam]);

  useEffect(() => {
    if (priceTakeoffParam) {
      setActiveTab("commercial");
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
      if (takeoffId && resolved === "commercial") {
        navigateTab(resolved, { priceTakeoff: takeoffId });
        return;
      }
      navigateTab(resolved);
      return;
    }

    if (tab === "commercial" && takeoffId) {
      navigateTab(tab, { priceTakeoff: takeoffId });
      return;
    }

    navigateTab(tab);
  }

  function handlePriceManual(takeoffItemId: string) {
    setPricingTakeoffId(takeoffItemId);
    navigateTab("commercial", { priceTakeoff: takeoffItemId });
  }

  function clearPricingTakeoffParam() {
    setPricingTakeoffId(null);
    navigateTab("commercial");
  }

  const projectCommandEntries = useMemo(
    () =>
      buildProjectCommandIndex({
        projectId: project.id,
        projectName: project.name,
        takeoffItems,
        pricingItems,
        materialItems,
        labourItems,
        clarifications,
        documents,
      }),
    [
      project.id,
      project.name,
      takeoffItems,
      pricingItems,
      materialItems,
      labourItems,
      clarifications,
      documents,
    ]
  );

  useEffect(() => {
    setWorkspaceContext({
      projectId: project.id,
      projectName: project.name,
      projectEntries: projectCommandEntries,
      navigateTab: (tab, options) => {
        if (isWorkspaceTab(tab)) {
          navigateTab(tab, options);
        }
      },
      onApplyPackage: () => {
        window.dispatchEvent(new CustomEvent("quanta:bulk-apply-package"));
      },
      onFocusTakeoffSearch: () => {
        document.getElementById("takeoff-search")?.focus();
      },
    });

    return () => setWorkspaceContext(null);
  }, [
    navigateTab,
    project.id,
    project.name,
    projectCommandEntries,
    setWorkspaceContext,
  ]);

  const aiReviewPendingCount = useMemo(
    () =>
      aiReviewItems.filter(
        (item) => item.status === "pending" || item.status === "adjusted"
      ).length,
    [aiReviewItems]
  );

  const isReviewTab = activeTab === "ai-review";

  return (
    <>
      <TakeoffRelationshipsProvider
        projectId={project.id}
        documents={documents}
        documentPages={documentPages}
        takeoffItems={takeoffItems}
        takeoffAssemblies={takeoffAssemblies}
        assemblyPackages={assemblyPackages}
        pricingItems={pricingItemsPlain}
        materialItems={materialItems}
        labourItems={labourItems}
        projectStandardLinks={projectStandardLinks}
        clarifications={clarifications}
        scopeGapSummary={scopeGapSummary}
        onNavigateTab={navigateTab}
      >
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isWorkspaceTab(value)) {
              navigateTab(value);
            }
          }}
          className="gap-4"
        >
          <ProjectWorkflowProgressBar
            steps={workflowSteps}
            activeTab={activeTab}
            onNavigateStep={navigateTab}
          />

          <TabsList
            variant="line"
            className="h-auto w-full flex-wrap justify-start gap-1"
          >
            {workspaceTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {tab.value === "ai-review" && aiReviewPendingCount > 0
                  ? ` (${aiReviewPendingCount})`
                  : ""}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewPanel
              project={project}
              readiness={readiness}
              scopeGapSummary={scopeGapSummary}
              workflowSteps={workflowSteps}
              onNavigateTab={(tab, takeoffId) => {
                if (takeoffId && tab === "commercial") {
                  navigateTab(tab, { priceTakeoff: takeoffId });
                  return;
                }
                navigateTab(tab);
              }}
            />
          </TabsContent>

          <TabsContent value="plans-specs">
            <PlansSpecsPanel
              projectId={project.id}
              documents={documents}
              documentPages={documentPages}
            />
          </TabsContent>

          <TabsContent value="ai-review" className={isReviewTab ? "mt-0" : undefined}>
            <AiReviewPanel
              projectId={project.id}
              items={aiReviewItems}
              documents={documents}
              documentPages={documentPages}
              takeoffItems={takeoffItems}
              takeoffAssemblies={takeoffAssemblies}
              assemblyPackages={assemblyPackages}
              materialItems={materialItems}
              labourItems={labourItems}
              pricingItems={pricingItemsPlain}
            />
          </TabsContent>

          <TabsContent value="takeoff">
            <TakeoffTabPanel
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

          <TabsContent value="build-up">
            <BuildUpPanel
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
                if (takeoffId && tab === "commercial") {
                  navigateTab(tab, { priceTakeoff: takeoffId });
                  return;
                }
                navigateTab(tab);
              }}
              pricingTakeoffId={
                activeTab === "build-up" ? pricingTakeoffId : null
              }
              onPricingTakeoffConsumed={clearPricingTakeoffParam}
            />
          </TabsContent>

          <TabsContent value="commercial">
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
              scopeGapsTotal={scopeGapSummary.totalGaps}
              exclusionsDraftedPercent={readiness.exclusionsDraftedPercent}
            />
          </TabsContent>
        </Tabs>
      </TakeoffRelationshipsProvider>
    </>
  );
}
