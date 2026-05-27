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
  return reviewProjectMaterialItemsAction(projectId, [itemId]);
}

export async function reviewProjectLabourItemAction(
  itemId: string,
  projectId: string
): Promise<EstimateActionResult> {
  return reviewProjectLabourItemsAction(projectId, [itemId]);
}

export async function reviewProjectMaterialItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<EstimateActionResult & { updatedCount?: number; failedCount?: number; message?: string }> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_material_items")
    .update({ reviewed: true })
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id)
    .in("id", itemIds);

  if (error) {
    return { error: error.message };
  }

  const updatedCount = itemIds.length;
  revalidatePath(`/projects/${projectId}`);
  return {
    updatedCount,
    failedCount: Math.max(0, itemIds.length - updatedCount),
    message: `${updatedCount} material line${updatedCount === 1 ? "" : "s"} marked reviewed`,
  };
}

export async function reviewProjectLabourItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<EstimateActionResult & { updatedCount?: number; failedCount?: number; message?: string }> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_labour_items")
    .update({ reviewed: true })
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id)
    .in("id", itemIds);

  if (error) {
    return { error: error.message };
  }

  const updatedCount = itemIds.length;
  revalidatePath(`/projects/${projectId}`);
  return {
    updatedCount,
    failedCount: Math.max(0, itemIds.length - updatedCount),
    message: `${updatedCount} labour line${updatedCount === 1 ? "" : "s"} marked reviewed`,
  };
}

export async function updateProjectMaterialItemsAction(
  projectId: string,
  itemIds: string[],
  updates: { supplier?: string | null }
): Promise<EstimateActionResult & { updatedCount?: number; failedCount?: number; message?: string }> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_material_items")
    .update({ supplier: updates.supplier ?? null })
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id)
    .in("id", itemIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    updatedCount: itemIds.length,
    message: `${itemIds.length} material line${itemIds.length === 1 ? "" : "s"} updated`,
  };
}

export async function updateProjectLabourItemsAction(
  projectId: string,
  itemIds: string[],
  updates: { charge_rate?: number }
): Promise<EstimateActionResult & { updatedCount?: number; failedCount?: number; message?: string }> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  if (updates.charge_rate !== undefined && updates.charge_rate < 0) {
    return { error: "Charge rate cannot be negative." };
  }

  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();

  if (updates.charge_rate !== undefined) {
    const { data: rows, error: fetchError } = await supabase
      .from("project_labour_items")
      .select("id, hours")
      .eq("project_id", projectId)
      .eq("organisation_id", session.profile.organisation_id)
      .in("id", itemIds);

    if (fetchError) {
      return { error: fetchError.message };
    }

    for (const row of rows ?? []) {
      const hours = Number(row.hours);
      const totalSell = hours * updates.charge_rate;
      const { error } = await supabase
        .from("project_labour_items")
        .update({
          charge_rate: updates.charge_rate,
          total_sell: totalSell,
        })
        .eq("id", row.id)
        .eq("project_id", projectId)
        .eq("organisation_id", session.profile.organisation_id);

      if (error) {
        return { error: error.message };
      }
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    updatedCount: itemIds.length,
    message: `${itemIds.length} labour line${itemIds.length === 1 ? "" : "s"} updated`,
  };
}

export async function deleteProjectMaterialItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<EstimateActionResult & { updatedCount?: number; failedCount?: number; message?: string }> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_material_items")
    .delete()
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id)
    .in("id", itemIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    updatedCount: itemIds.length,
    message: `${itemIds.length} material line${itemIds.length === 1 ? "" : "s"} deleted`,
  };
}

export async function deleteProjectLabourItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<EstimateActionResult & { updatedCount?: number; failedCount?: number; message?: string }> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  const session = await requireProjectSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_labour_items")
    .delete()
    .eq("project_id", projectId)
    .eq("organisation_id", session.profile.organisation_id)
    .in("id", itemIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    updatedCount: itemIds.length,
    message: `${itemIds.length} labour line${itemIds.length === 1 ? "" : "s"} deleted`,
  };
}
