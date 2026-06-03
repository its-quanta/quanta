"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { insertProjectWithFallback } from "@/src/lib/projects/project-schema";
import { createClient } from "@/src/lib/supabase/server";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectStatus,
} from "@/src/types/database";

export type CreateProjectState = {
  error?: string;
};

export type UpdateProjectState = {
  error?: string;
  success?: boolean;
};

function parseEstimatedValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function createProjectAction(
  _prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = optionalString(formData.get("clientName"));
  const siteAddress = optionalString(formData.get("siteAddress"));
  const projectType = optionalString(formData.get("projectType"));
  const tradeScope = optionalString(formData.get("tradeScope"));
  const tenderDueDate = optionalString(formData.get("tenderDueDate"));
  const notes = optionalString(formData.get("notes"));

  if (!name) {
    return { error: "Project name is required." };
  }

  if (
    projectType &&
    !PROJECT_TYPES.includes(projectType as (typeof PROJECT_TYPES)[number])
  ) {
    return { error: "Select a valid project type." };
  }

  const { user, profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const minimalPayload = {
    organisation_id: profile.organisation_id,
    created_by: user.id,
    name,
    client_name: clientName,
    status: "draft" as const,
  };

  const standardPayload = {
    ...minimalPayload,
    tender_due_date: tenderDueDate,
    notes,
  };

  const extendedPayload = {
    ...standardPayload,
    site_address: siteAddress,
    project_type: projectType,
    trade_scope: tradeScope,
  };

  const { error } = await insertProjectWithFallback(supabase, {
    extended: extendedPayload,
    standard: standardPayload,
    minimal: minimalPayload,
  });

  if (error) {
    return { error };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProjectAction(
  projectId: string,
  _prevState: UpdateProjectState,
  formData: FormData
): Promise<UpdateProjectState> {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = optionalString(formData.get("clientName"));
  const siteAddress = optionalString(formData.get("siteAddress"));
  const projectType = optionalString(formData.get("projectType"));
  const tradeScope = optionalString(formData.get("tradeScope"));
  const tenderDueDate = optionalString(formData.get("tenderDueDate"));
  const notes = optionalString(formData.get("notes"));
  const statusRaw = String(formData.get("status") ?? "").trim();
  const estimatedValue = parseEstimatedValue(
    String(formData.get("estimatedValue") ?? "")
  );

  if (!name) {
    return { error: "Project name is required." };
  }

  if (
    projectType &&
    !PROJECT_TYPES.includes(projectType as (typeof PROJECT_TYPES)[number])
  ) {
    return { error: "Select a valid project type." };
  }

  if (statusRaw && !PROJECT_STATUSES.includes(statusRaw as ProjectStatus)) {
    return { error: "Select a valid tender status." };
  }

  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select("id, organisation_id")
    .eq("id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!existing) {
    return { error: "Project not found." };
  }

  const minimalPayload = {
    name,
    client_name: clientName,
    status: (statusRaw || "draft") as ProjectStatus,
    updated_at: new Date().toISOString(),
  };

  const standardPayload = {
    ...minimalPayload,
    tender_due_date: tenderDueDate,
    notes,
  };

  const extendedPayload = {
    ...standardPayload,
    site_address: siteAddress,
    project_type: projectType,
    trade_scope: tradeScope,
    estimated_value: estimatedValue,
  };

  const attempts = [extendedPayload, standardPayload, minimalPayload];
  let lastError: string | null = null;

  for (const payload of attempts) {
    const { error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .eq("organisation_id", profile.organisation_id);

    if (!error) {
      revalidatePath("/dashboard");
      revalidatePath("/projects");
      revalidatePath(`/projects/${projectId}`);
      return { success: true };
    }

    lastError = error.message;

    const { isMissingColumnError } = await import("@/src/lib/auth/profile-schema");
    if (!isMissingColumnError(error.message)) {
      return { error: error.message };
    }
  }

  return { error: lastError ?? "Could not update project." };
}
