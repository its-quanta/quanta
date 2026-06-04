import { Suspense } from "react";
import { notFound } from "next/navigation";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { ProjectPageMain } from "@/components/projects/project-page-main";
import { ProjectWorkspaceTabs } from "@/components/projects/project-workspace-tabs";
import { getDocumentPagesForProject } from "@/src/lib/documents/document-page-queries";
import { getDocumentsForProject } from "@/src/lib/documents/queries";
import { getActiveAssemblyPackagesForOrganisation } from "@/src/lib/assemblies/queries";
import { getPricingItemsForProject } from "@/src/lib/pricing/queries";
import { getProjectEstimateItems } from "@/src/lib/estimate-generation/queries";
import { getProjectScopeGapSummary } from "@/src/lib/scope-gaps/queries";
import {
  getStandardLinksForProject,
  getStandardLinksWithStandardsForProject,
  getStandardsForOrganisation,
} from "@/src/lib/standards/queries";
import { getTakeoffItemAssembliesForProject } from "@/src/lib/takeoff-assembly/queries";
import { getAiReviewItemsForProject } from "@/src/lib/ai-review/queries";
import {
  getClarificationTemplatesForOrganisation,
  getClarificationsForProject,
} from "@/src/lib/clarifications/queries";
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

  const [
    documents,
    documentPages,
    takeoffItems,
    pricingItems,
    assemblyPackages,
    takeoffAssemblies,
    estimateData,
    scopeGapSummary,
    organisationStandards,
    projectStandardLinks,
    standardLinks,
    clarifications,
    clarificationTemplates,
    aiReviewItems,
  ] = await Promise.all([
    getDocumentsForProject(project.id, profile.organisation_id),
    getDocumentPagesForProject(project.id, profile.organisation_id),
    getTakeoffItemsForProject(project.id, profile.organisation_id),
    getPricingItemsForProject(project.id, profile.organisation_id),
    getActiveAssemblyPackagesForOrganisation(profile.organisation_id),
    getTakeoffItemAssembliesForProject(
      project.id,
      profile.organisation_id
    ),
    getProjectEstimateItems(project.id, profile.organisation_id),
    getProjectScopeGapSummary(project.id, profile.organisation_id),
    getStandardsForOrganisation(profile.organisation_id, {
      activeOnly: true,
    }),
    getStandardLinksWithStandardsForProject(
      project.id,
      profile.organisation_id
    ),
    getStandardLinksForProject(project.id, profile.organisation_id),
    getClarificationsForProject(project.id, profile.organisation_id),
    getClarificationTemplatesForOrganisation(profile.organisation_id),
    getAiReviewItemsForProject(project.id, profile.organisation_id).then(
      (result) => result.items
    ),
  ]);

  const { materialItems, labourItems, loadError: estimateLoadError } =
    estimateData;

  const pricingItemsPlain = pricingItems.map(
    ({
      takeoff_item: _takeoff,
      ...pricing
    }) => pricing
  );

  return (
    <>
      <AppTopBar
        title={project.name}
        description={
          [project.client_name, project.trade_scope].filter(Boolean).join(" · ") ||
          "Tender workspace"
        }
      />
      <Suspense
        fallback={
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto h-32 max-w-[96rem] animate-pulse rounded-lg bg-muted/40" />
          </main>
        }
      >
        <ProjectPageMain>
          <ProjectWorkspaceTabs
              project={project}
              documents={documents}
              documentPages={documentPages}
              takeoffItems={takeoffItems}
              pricingItems={pricingItems}
              assemblyPackages={assemblyPackages}
              takeoffAssemblies={takeoffAssemblies}
              pricingItemsPlain={pricingItemsPlain}
              materialItems={materialItems}
              labourItems={labourItems}
              estimateLoadError={estimateLoadError}
              scopeGapSummary={scopeGapSummary}
              organisationStandards={organisationStandards}
              projectStandardLinks={projectStandardLinks}
              standardLinks={standardLinks}
              clarifications={clarifications}
              clarificationTemplates={clarificationTemplates}
              aiReviewItems={aiReviewItems}
            />
        </ProjectPageMain>
      </Suspense>
    </>
  );
}
