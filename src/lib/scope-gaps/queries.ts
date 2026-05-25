import { detectProjectScopeGaps } from "@/src/lib/scope-gaps/detect";
import type {
  OrganisationScopeGapSummary,
  ScopeGapSummary,
} from "@/src/lib/scope-gaps/types";
import { getProjectEstimateItems } from "@/src/lib/estimate-generation/queries";
import { getPricingItemsForProject } from "@/src/lib/pricing/queries";
import { getStandardLinksForProject } from "@/src/lib/standards/queries";
import { getTakeoffItemAssembliesForProject } from "@/src/lib/takeoff-assembly/queries";
import { getTakeoffItemsForProject } from "@/src/lib/takeoff/queries";
import { createClient } from "@/src/lib/supabase/server";
import type { Project, ProjectStatus } from "@/src/types/database";

const ACTIVE_STATUSES: ProjectStatus[] = ["draft", "in_review", "submitted"];

export async function getProjectScopeGapSummary(
  projectId: string,
  organisationId: string
): Promise<ScopeGapSummary> {
  const [
    takeoffItems,
    takeoffAssemblies,
    pricingItems,
    estimateData,
    standardLinks,
  ] = await Promise.all([
    getTakeoffItemsForProject(projectId, organisationId),
    getTakeoffItemAssembliesForProject(projectId, organisationId),
    getPricingItemsForProject(projectId, organisationId),
    getProjectEstimateItems(projectId, organisationId),
    getStandardLinksForProject(projectId, organisationId),
  ]);

  const pricingPlain = pricingItems.map(
    ({ takeoff_item: _takeoff, ...row }) => row
  );

  return detectProjectScopeGaps({
    projectId,
    takeoffItems,
    takeoffAssemblies,
    pricingItems: pricingPlain,
    materialItems: estimateData.materialItems,
    labourItems: estimateData.labourItems,
    standardLinks,
  });
}

export async function getOrganisationScopeGapSummary(
  organisationId: string
): Promise<OrganisationScopeGapSummary> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("organisation_id", organisationId)
    .in("status", ACTIVE_STATUSES)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getOrganisationScopeGapSummary projects:", error.message);
    return {
      totalGaps: 0,
      byKind: {
        missing_package: 0,
        missing_pricing: 0,
        missing_material_generation: 0,
        missing_labour_generation: 0,
        missing_drawing_reference: 0,
        missing_standards_reference: 0,
      },
      projectSummaries: [],
    };
  }

  const byKind = {
    missing_package: 0,
    missing_pricing: 0,
    missing_material_generation: 0,
    missing_labour_generation: 0,
    missing_drawing_reference: 0,
    missing_standards_reference: 0,
  };

  let totalGaps = 0;
  const projectSummaries: OrganisationScopeGapSummary["projectSummaries"] =
    [];

  for (const project of projects ?? []) {
    const row = project as Pick<Project, "id" | "name">;
    const gapSummary = await getProjectScopeGapSummary(
      row.id,
      organisationId
    );

    totalGaps += gapSummary.totalGaps;

    for (const kind of Object.keys(byKind) as (keyof typeof byKind)[]) {
      byKind[kind] += gapSummary.byKind[kind];
    }

    if (gapSummary.totalGaps > 0) {
      projectSummaries.push({
        project_id: row.id,
        project_name: row.name,
        gap_count: gapSummary.totalGaps,
      });
    }
  }

  projectSummaries.sort((a, b) => b.gap_count - a.gap_count);

  return {
    totalGaps,
    byKind,
    projectSummaries,
  };
}
