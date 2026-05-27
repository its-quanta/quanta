import { notFound } from "next/navigation";

import { TenderPackPreviewWorkspace } from "@/components/submission/tender-pack-preview-workspace";
import { getOrganisationById } from "@/src/lib/organisations/queries";
import {
  resolveOrganisationCurrency,
  toOrganisationSettingsSnapshot,
} from "@/src/lib/organisations/settings";
import { getDocumentsForProject } from "@/src/lib/documents/queries";
import { getPricingItemsForProject } from "@/src/lib/pricing/queries";
import { getProjectEstimateItems } from "@/src/lib/estimate-generation/queries";
import { getProjectById } from "@/src/lib/projects/queries";
import { getStandardLinksWithStandardsForProject } from "@/src/lib/standards/queries";
import { getTakeoffItemAssembliesForProject } from "@/src/lib/takeoff-assembly/queries";
import { buildSubmissionPreview } from "@/src/lib/submission/preview";
import { buildTenderPackPreview } from "@/src/lib/submission/tender-pack-preview";
import { validateTender } from "@/src/lib/submission/validate-tender";
import { getClarificationsForProject } from "@/src/lib/clarifications/queries";
import { getTakeoffItemsForProject } from "@/src/lib/takeoff/queries";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";

type TenderPackPreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TenderPackPreviewPage({
  params,
}: TenderPackPreviewPageProps) {
  const { id } = await params;
  const { profile } = await requireOrganisationProfile();
  const [project, organisation] = await Promise.all([
    getProjectById(id),
    getOrganisationById(profile.organisation_id),
  ]);

  if (!project || project.organisation_id !== profile.organisation_id) {
    notFound();
  }

  const settings = toOrganisationSettingsSnapshot(
    organisation ?? {
      id: profile.organisation_id,
      name: "Organisation",
      country: null,
      currency: null,
      tax_rate: null,
      default_margin_percentage: null,
      default_markup_percentage: null,
      default_labour_cost_rate: null,
      default_labour_charge_rate: null,
    }
  );
  const currency = resolveOrganisationCurrency(organisation);

  const [
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    estimateData,
    clarifications,
    projectStandardLinks,
  ] = await Promise.all([
    getDocumentsForProject(project.id, profile.organisation_id),
    getTakeoffItemsForProject(project.id, profile.organisation_id),
    getPricingItemsForProject(project.id, profile.organisation_id),
    getTakeoffItemAssembliesForProject(project.id, profile.organisation_id),
    getProjectEstimateItems(project.id, profile.organisation_id),
    getClarificationsForProject(project.id, profile.organisation_id),
    getStandardLinksWithStandardsForProject(
      project.id,
      profile.organisation_id
    ),
  ]);

  const { materialItems, labourItems } = estimateData;

  const validation = validateTender({
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    materialItems,
    labourItems,
    standardLinks: projectStandardLinks,
    clarifications,
    organisationSettings: settings,
  });

  const packContents = buildSubmissionPreview({
    documents,
    takeoffItems,
    pricingItems,
    materialItems,
    labourItems,
    clarifications,
  });

  const generatedAt = new Date().toISOString();
  const previewData = buildTenderPackPreview({
    project,
    organisationSettings: settings,
    documents,
    takeoffItems,
    pricingItems,
    takeoffAssemblies,
    materialItems,
    labourItems,
    clarifications,
    standardLinks: projectStandardLinks,
    validation,
    packContents,
    generatedAt,
  });

  return (
    <TenderPackPreviewWorkspace
      projectId={project.id}
      projectName={project.name}
      data={previewData}
      currency={currency}
    />
  );
}
