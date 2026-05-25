"use server";

import { revalidatePath } from "next/cache";

import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { createClient } from "@/src/lib/supabase/server";
import type { OrganisationProfile } from "@/src/types/database";
import type { User } from "@supabase/supabase-js";

export type EstimateActionResult = {
  error?: string;
};

async function requireProjectSession(projectId: string): Promise<
  | { error: string }
  | { user: User; profile: OrganisationProfile }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const profile = await getProfileForUser(user.id);

  if (!profile || !hasOrganisation(profile)) {
    return { error: "Complete onboarding before updating estimate lines." };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (error || !project) {
    return { error: "Project not found." };
  }

  return { user, profile: profile as OrganisationProfile };
}

export async function reviewProjectMaterialItemAction(
  itemId: string,
  projectId: string
): Promise<EstimateActionResult> {
  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_material_items")
    .update({ reviewed: true })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function reviewProjectLabourItemAction(
  itemId: string,
  projectId: string
): Promise<EstimateActionResult> {
  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_labour_items")
    .update({ reviewed: true })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}
