import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectWorkspaceTabs } from "@/components/projects/project-workspace-tabs";
import { Badge } from "@/components/ui/badge";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <>
      <AppTopBar
        title="Project workspace"
        description={`Reference ${id.slice(0, 8)}…`}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <PageHeader
            title="Project workspace"
            description="Takeoff, pricing, clarifications, and export for this tender."
            actions={<Badge variant="secondary">Draft</Badge>}
          />

          <ProjectWorkspaceTabs projectId={id} />
        </div>
      </main>
    </>
  );
}
