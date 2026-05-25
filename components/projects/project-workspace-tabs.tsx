"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectDocumentsPanel } from "@/components/documents/project-documents-panel";
import { ProjectLabourPanel } from "@/components/labour/project-labour-panel";
import { ProjectMaterialsPanel } from "@/components/materials/project-materials-panel";
import { ProjectPricingPanel } from "@/components/pricing/project-pricing-panel";
import { ProjectScopeGapsCard } from "@/components/scope-gaps/project-scope-gaps-card";
import { ProjectReadinessSummary } from "@/components/projects/project-readiness-summary";
import { ProjectTakeoffPanel } from "@/components/takeoff/project-takeoff-panel";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { computeProjectReadiness } from "@/src/lib/projects/readiness";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type { ScopeGapSummary } from "@/src/lib/scope-gaps/types";
import type {
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

const workspaceTabs = [
  { value: "overview", label: "Overview" },
  { value: "documents", label: "Documents" },
  { value: "takeoff", label: "Takeoff" },
  { value: "materials", label: "Materials" },
  { value: "labour", label: "Labour" },
  { value: "pricing", label: "Pricing" },
  { value: "clarifications", label: "Exclusions & RFIs" },
  { value: "export", label: "Export" },
] as const;

type WorkspaceTabValue = (typeof workspaceTabs)[number]["value"];

const TAB_VALUES = new Set<string>(workspaceTabs.map((tab) => tab.value));

function isWorkspaceTab(value: string | null): value is WorkspaceTabValue {
  return value !== null && TAB_VALUES.has(value);
}

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
};

function TabEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function OverviewPanel({ project }: { project: Project }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project overview</CardTitle>
        <CardDescription>
          Tender metadata and workspace status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Client</dt>
            <dd className="mt-1 text-sm text-foreground">
              {project.client_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <ProjectStatusBadge status={project.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Project type</dt>
            <dd className="mt-1 text-sm text-foreground">
              {project.project_type ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Trade scope</dt>
            <dd className="mt-1 text-sm text-foreground">
              {project.trade_scope ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Due date</dt>
            <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
              {formatDate(project.tender_due_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Estimated value</dt>
            <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
              {formatCurrency(project.estimated_value)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Address</dt>
            <dd className="mt-1 text-sm text-foreground">
              {project.site_address ?? "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {project.notes ?? "—"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

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
}: ProjectWorkspaceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const priceTakeoffParam = searchParams.get("priceTakeoff");

  const [activeTab, setActiveTab] = useState<WorkspaceTabValue>(
    isWorkspaceTab(tabParam) ? tabParam : "overview"
  );
  const [pricingTakeoffId, setPricingTakeoffId] = useState<string | null>(null);

  const readiness = useMemo(
    () =>
      computeProjectReadiness(
        documents,
        takeoffItems,
        pricingItemsPlain,
        takeoffAssemblies
      ),
    [documents, takeoffItems, pricingItemsPlain, takeoffAssemblies]
  );

  useEffect(() => {
    if (isWorkspaceTab(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (priceTakeoffParam) {
      setActiveTab("pricing");
      setPricingTakeoffId(priceTakeoffParam);
    }
  }, [priceTakeoffParam]);

  const navigateTab = useCallback(
    (
      tab: WorkspaceTabValue,
      options?: { priceTakeoff?: string }
    ) => {
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
      return;
    }
    if (tab === "pricing" && takeoffId) {
      navigateTab(tab, { priceTakeoff: takeoffId });
      return;
    }
    navigateTab(tab);
  }

  function handlePriceManual(takeoffItemId: string) {
    setPricingTakeoffId(takeoffItemId);
    navigateTab("pricing", { priceTakeoff: takeoffItemId });
  }

  function clearPricingTakeoffParam() {
    setPricingTakeoffId(null);
    navigateTab("pricing");
  }

  return (
    <div className="flex flex-col gap-4">
      <ProjectScopeGapsCard
        projectId={project.id}
        totalGaps={scopeGapSummary.totalGaps}
        byKind={scopeGapSummary.byKind}
        gaps={scopeGapSummary.gaps}
        onNavigateTab={handleScopeGapNavigate}
      />

      <ProjectReadinessSummary counts={readiness} />

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
          <OverviewPanel project={project} />
        </TabsContent>
        <TabsContent value="documents">
          <ProjectDocumentsPanel
            projectId={project.id}
            documents={documents}
          />
        </TabsContent>
        <TabsContent value="takeoff">
          <ProjectTakeoffPanel
            projectId={project.id}
            items={takeoffItems}
            documents={documents}
            documentPages={documentPages}
            assemblyPackages={assemblyPackages}
            takeoffAssemblies={takeoffAssemblies}
            pricingItems={pricingItemsPlain}
            organisationStandards={organisationStandards}
            projectStandardLinks={projectStandardLinks}
            onPriceManual={handlePriceManual}
          />
        </TabsContent>
        <TabsContent value="materials">
          <ProjectMaterialsPanel
            projectId={project.id}
            materialItems={materialItems}
            takeoffAssemblies={takeoffAssemblies}
            estimateLoadError={estimateLoadError}
          />
        </TabsContent>
        <TabsContent value="labour">
          <ProjectLabourPanel
            projectId={project.id}
            labourItems={labourItems}
            takeoffAssemblies={takeoffAssemblies}
            estimateLoadError={estimateLoadError}
          />
        </TabsContent>
        <TabsContent value="pricing">
          <ProjectPricingPanel
            projectId={project.id}
            pricingItems={pricingItems}
            takeoffItems={takeoffItems}
            takeoffAssemblies={takeoffAssemblies}
            assemblyPackages={assemblyPackages}
            pricingItemsPlain={pricingItemsPlain}
            organisationStandards={organisationStandards}
            projectStandardLinks={projectStandardLinks}
            initialTakeoffItemId={pricingTakeoffId}
            onInitialTakeoffConsumed={clearPricingTakeoffParam}
          />
        </TabsContent>
        <TabsContent value="clarifications">
          <TabEmptyState
            title="Exclusions & RFIs"
            description="Record exclusions, assumptions, and RFIs for this tender."
          />
        </TabsContent>
        <TabsContent value="export">
          <TabEmptyState
            title="Export"
            description="Export reflects saved data as of now. Excel export connects in a later phase."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
