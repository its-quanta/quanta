"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const workspaceTabs = [
  { value: "overview", label: "Overview" },
  { value: "documents", label: "Documents" },
  { value: "takeoff", label: "Takeoff" },
  { value: "materials", label: "Materials" },
  { value: "labour", label: "Labour" },
  { value: "pricing", label: "Pricing" },
  { value: "clarifications", label: "Clarifications" },
  { value: "export", label: "Export" },
  { value: "activity", label: "Activity" },
] as const;

type ProjectWorkspaceTabsProps = {
  projectId: string;
};

function TabEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function ProjectWorkspaceTabs({ projectId }: ProjectWorkspaceTabsProps) {
  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1">
        {workspaceTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <TabEmptyState
          title="Project overview"
          description="Client details, tender dates, and status will appear here once project data is connected."
        />
      </TabsContent>
      <TabsContent value="documents">
        <TabEmptyState
          title="Documents"
          description="Upload drawings, specifications, and schedules for this tender."
        />
      </TabsContent>
      <TabsContent value="takeoff">
        <TabEmptyState
          title="Takeoff"
          description="Build quantity lines manually. AI-assisted drafts will be available after the manual workflow is complete."
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
          title="Clarifications"
          description="Record exclusions, assumptions, and RFIs for this tender."
        />
      </TabsContent>
      <TabsContent value="export">
        <TabEmptyState
          title="Export"
          description="Export reflects saved data as of now. Excel export connects in a later phase."
        />
      </TabsContent>
      <TabsContent value="activity">
        <TabEmptyState
          title="Activity"
          description="Audit trail of changes and approvals will appear here."
        />
      </TabsContent>

      <p className="sr-only">Project ID: {projectId}</p>
    </Tabs>
  );
}
