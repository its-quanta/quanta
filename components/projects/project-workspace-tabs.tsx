"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectDocumentsPanel } from "@/components/documents/project-documents-panel";
import { ProjectTakeoffPanel } from "@/components/takeoff/project-takeoff-panel";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Document, DocumentPage, Project, TakeoffItem } from "@/src/types/database";

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

type ProjectWorkspaceTabsProps = {
  project: Project;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
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
}: ProjectWorkspaceTabsProps) {
  return (
    <Tabs defaultValue="overview" className="gap-4">
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
        />
      </TabsContent>
      <TabsContent value="materials">
        <TabEmptyState
          title="Materials"
          description="Material lines and unit costs will be priced here."
        />
      </TabsContent>
      <TabsContent value="labour">
        <TabEmptyState
          title="Labour"
          description="Labour build-up lines and rates will be managed here."
        />
      </TabsContent>
      <TabsContent value="pricing">
        <TabEmptyState
          title="Pricing"
          description="Margin, markup, and sell price totals will be calculated here."
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
  );
}
