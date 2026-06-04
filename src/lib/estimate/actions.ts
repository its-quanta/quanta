"use server";

import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { getProjectEstimateItems } from "@/src/lib/estimate-generation/queries";
import { getPricingItemsForProject } from "@/src/lib/pricing/queries";
import { getTakeoffItemAssembliesForProject } from "@/src/lib/takeoff-assembly/queries";
import { createClient } from "@/src/lib/supabase/server";
import type {
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";
import type { User } from "@supabase/supabase-js";

export type EstimateWorkspaceData = {
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
};

async function requireEstimateSession(projectId: string): Promise<
  | { error: string }
  | { user: User; organisationId: string }
> {
  if (!projectId) {
    return { error: "Project not found." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in." };
  }

  const profile = await getProfileForUser(user.id);

  if (!profile || !hasOrganisation(profile)) {
    return { error: "Organisation not found." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organisation_id")
    .eq("id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (projectError || !project) {
    return { error: "Project not found." };
  }

  return { user, organisationId: profile.organisation_id };
}

export async function fetchEstimateWorkspaceDataAction(
  projectId: string
): Promise<EstimateWorkspaceData & { error: string | null }> {
  const session = await requireEstimateSession(projectId);

  if ("error" in session) {
    return {
      takeoffAssemblies: [],
      pricingItems: [],
      materialItems: [],
      labourItems: [],
      error: session.error,
    };
  }

  const [takeoffAssemblies, pricingWithTakeoff, estimateItems] = await Promise.all([
    getTakeoffItemAssembliesForProject(projectId, session.organisationId),
    getPricingItemsForProject(projectId, session.organisationId),
    getProjectEstimateItems(projectId, session.organisationId),
  ]);

  const pricingItems = pricingWithTakeoff.map(
    ({ takeoff_item: _takeoff, ...pricing }) => pricing
  );

  return {
    takeoffAssemblies,
    pricingItems,
    materialItems: estimateItems.materialItems,
    labourItems: estimateItems.labourItems,
    error: estimateItems.loadError,
  };
}
