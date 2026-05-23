"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { insertProjectWithFallback } from "@/src/lib/projects/project-schema";
import { createClient } from "@/src/lib/supabase/server";
import { PROJECT_TYPES } from "@/src/types/database";

export type CreateProjectState = {
  error?: string;
};

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
