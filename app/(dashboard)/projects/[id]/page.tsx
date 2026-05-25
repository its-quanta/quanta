import { notFound } from "next/navigation";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectWorkspaceTabs } from "@/components/projects/project-workspace-tabs";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { getDocumentPagesForProject } from "@/src/lib/documents/document-page-queries";
import { getDocumentsForProject } from "@/src/lib/documents/queries";
import { getPricingItemsForProject } from "@/src/lib/pricing/queries";
import { getTakeoffItemsForProject } from "@/src/lib/takeoff/queries";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getProjectById } from "@/src/lib/projects/queries";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const { profile } = await requireOrganisationProfile();
  const project = await getProjectById(id);

  if (!project || project.organisation_id !== profile.organisation_id) {
    notFound();
  }

  const [documents, documentPages, takeoffItems, pricingItems] = await Promise.all([
    getDocumentsForProject(project.id, profile.organisation_id),
    getDocumentPagesForProject(project.id, profile.organisation_id),
    getTakeoffItemsForProject(project.id, profile.organisation_id),
    getPricingItemsForProject(project.id, profile.organisation_id),
  ]);

  return (
    <>
      <AppTopBar
        title={project.name}
        description={
          [project.client_name, project.trade_scope].filter(Boolean).join(" · ") ||
          "Tender workspace"
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tender project</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {project.client_name ?? "No client set"}
                {project.tender_due_date
                  ? ` · Due ${formatDate(project.tender_due_date)}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <ProjectStatusBadge status={project.status} />
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                Est. {formatCurrency(project.estimated_value)}
              </p>
            </div>
          </header>

          <ProjectWorkspaceTabs
            project={project}
            documents={documents}
            documentPages={documentPages}
            takeoffItems={takeoffItems}
            pricingItems={pricingItems}
          />
        </div>
      </main>
    </>
  );
}
