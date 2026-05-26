"use server";

import { revalidatePath } from "next/cache";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { DEFAULT_CLARIFICATION_TEMPLATES } from "@/src/lib/clarifications/constants";
import {
  logClarificationError,
  userFacingClarificationError,
} from "@/src/lib/clarifications/errors";
import { buildClarificationInsertRow } from "@/src/lib/clarifications/schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  ClarificationType,
  TenderClarificationInput,
  TenderClarificationUpdate,
} from "@/src/types/database";

export type ClarificationActionResult = {
  error?: string;
  id?: string;
};

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

function trimRequired(value: string, label: string): { value?: string; error?: string } {
  const text = value.trim();
  if (!text) {
    return { error: `${label} is required.` };
  }
  return { value: text };
}

function trimOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function resolveOrganisationId(
  organisationId: string | null | undefined
): { organisationId?: string; error?: string } {
  if (!organisationId) {
    return {
      error:
        "Organisation not set. Complete onboarding or sign in again before adding clarifications.",
    };
  }
  return { organisationId };
}

async function assertProjectInOrg(
  projectId: string,
  organisationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    logClarificationError("assertProjectInOrg", error);
    return { error: "Could not verify project access." };
  }
  if (!data) {
    return { error: "Project not found." };
  }
  return {};
}

function normalizeInputFields(input: TenderClarificationInput): {
  related_drawing: string | null;
  related_takeoff_item_id: string | null;
} {
  const related_drawing = trimOptional(
    input.related_drawing ??
      (input as { related_drawing_reference?: string | null })
        .related_drawing_reference ??
      null
  );
  const related_takeoff_item_id =
    input.related_takeoff_item_id ??
    (input as { takeoff_item_id?: string | null }).takeoff_item_id ??
    null;

  return { related_drawing, related_takeoff_item_id };
}

export async function createClarificationAction(
  projectId: string,
  input: TenderClarificationInput
): Promise<ClarificationActionResult> {
  const title = trimRequired(input.title, "Title");
  if (title.error) {
    return { error: title.error };
  }

  const { profile } = await requireOrganisationProfile();
  const org = resolveOrganisationId(profile.organisation_id);
  if (org.error || !org.organisationId) {
    return { error: org.error };
  }

  const projectCheck = await assertProjectInOrg(projectId, org.organisationId);
  if (projectCheck.error) {
    return { error: projectCheck.error };
  }

  const { related_drawing, related_takeoff_item_id } = normalizeInputFields(input);
  const status = input.status ?? (input.type === "rfi" ? "open" : "draft");
  const priority = input.type === "rfi" ? (input.priority ?? "medium") : null;

  const row = buildClarificationInsertRow({
    organisationId: org.organisationId,
    projectId,
    type: input.type,
    title: title.value!,
    description: trimOptional(input.description ?? null),
    category: trimOptional(input.category ?? null),
    status,
    priority,
    related_drawing,
    related_takeoff_item_id,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tender_clarifications")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    logClarificationError("createClarificationAction", error);
    return { error: userFacingClarificationError(error) };
  }

  revalidateProject(projectId);
  return { id: data.id };
}

export async function updateClarificationAction(
  projectId: string,
  clarificationId: string,
  updates: TenderClarificationUpdate
): Promise<ClarificationActionResult> {
  const { profile } = await requireOrganisationProfile();
  const org = resolveOrganisationId(profile.organisation_id);
  if (org.error || !org.organisationId) {
    return { error: org.error };
  }

  const projectCheck = await assertProjectInOrg(projectId, org.organisationId);
  if (projectCheck.error) {
    return { error: projectCheck.error };
  }

  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    const title = trimRequired(updates.title, "Title");
    if (title.error) {
      return { error: title.error };
    }
    payload.title = title.value;
  }
  if (updates.description !== undefined) {
    payload.description = trimOptional(updates.description);
  }
  if (updates.category !== undefined) {
    payload.category = trimOptional(updates.category);
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.priority !== undefined) {
    payload.priority = updates.priority;
  }
  if (updates.reviewed !== undefined) {
    payload.reviewed = updates.reviewed;
  }

  const drawing =
    updates.related_drawing ??
    (updates as { related_drawing_reference?: string | null })
      .related_drawing_reference;
  if (drawing !== undefined) {
    payload.related_drawing = trimOptional(drawing);
  }

  const takeoffId =
    updates.related_takeoff_item_id ??
    (updates as { takeoff_item_id?: string | null }).takeoff_item_id;
  if (takeoffId !== undefined) {
    payload.related_takeoff_item_id = takeoffId || null;
  }

  if (Object.keys(payload).length === 0) {
    return { error: "No changes to save." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tender_clarifications")
    .update(payload)
    .eq("id", clarificationId)
    .eq("project_id", projectId)
    .eq("organisation_id", org.organisationId);

  if (error) {
    logClarificationError("updateClarificationAction", error);
    return { error: userFacingClarificationError(error) };
  }

  revalidateProject(projectId);
  return {};
}

export async function deleteClarificationAction(
  projectId: string,
  clarificationId: string
): Promise<ClarificationActionResult> {
  const { profile } = await requireOrganisationProfile();
  const org = resolveOrganisationId(profile.organisation_id);
  if (org.error || !org.organisationId) {
    return { error: org.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tender_clarifications")
    .delete()
    .eq("id", clarificationId)
    .eq("project_id", projectId)
    .eq("organisation_id", org.organisationId);

  if (error) {
    logClarificationError("deleteClarificationAction", error);
    return { error: userFacingClarificationError(error) };
  }

  revalidateProject(projectId);
  return {};
}

export async function seedOrganisationClarificationTemplatesAction(): Promise<ClarificationActionResult> {
  const { profile } = await requireOrganisationProfile();
  const org = resolveOrganisationId(profile.organisation_id);
  if (org.error || !org.organisationId) {
    return { error: org.error };
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("clarification_templates")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", org.organisationId);

  if (countError) {
    logClarificationError("seedOrganisationClarificationTemplatesAction", countError);
    if (/relation .+ does not exist/i.test(countError.message)) {
      return {
        error: "Company templates table is not set up. Use built-in templates on the project.",
      };
    }
    return { error: userFacingClarificationError(countError) };
  }

  if ((count ?? 0) > 0) {
    return { error: "Company templates already exist." };
  }

  const rows = DEFAULT_CLARIFICATION_TEMPLATES.map((template, index) => ({
    organisation_id: org.organisationId,
    type: template.type,
    title: template.title,
    description: template.description,
    category: template.category,
    sort_order: index,
  }));

  const { error } = await supabase.from("clarification_templates").insert(rows);

  if (error) {
    logClarificationError("seedOrganisationClarificationTemplatesAction", error);
    return { error: userFacingClarificationError(error) };
  }

  revalidatePath("/settings");
  return {};
}

export async function addClarificationFromTemplateAction(
  projectId: string,
  templateId: string,
  type: ClarificationType
): Promise<ClarificationActionResult> {
  const { profile } = await requireOrganisationProfile();
  const org = resolveOrganisationId(profile.organisation_id);
  if (org.error || !org.organisationId) {
    return { error: org.error };
  }

  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("clarification_templates")
    .select("id, type, title, description, category")
    .eq("id", templateId)
    .eq("organisation_id", org.organisationId)
    .maybeSingle();

  if (templateError) {
    logClarificationError("addClarificationFromTemplateAction", templateError);
    return { error: userFacingClarificationError(templateError) };
  }

  if (!template) {
    return { error: "Template not found." };
  }

  if (template.type !== type && type !== "rfi") {
    return { error: "Template type does not match." };
  }

  return createClarificationAction(projectId, {
    type,
    title: String(template.title),
    description: template.description ? String(template.description) : null,
    category: template.category ? String(template.category) : null,
    status: type === "rfi" ? "open" : "draft",
  });
}

export async function addClarificationFromDefaultTemplateAction(
  projectId: string,
  templateIndex: number,
  type: "exclusion" | "assumption"
): Promise<ClarificationActionResult> {
  const templates = DEFAULT_CLARIFICATION_TEMPLATES.filter(
    (row) => row.type === type
  );
  const template = templates[templateIndex];
  if (!template) {
    return { error: "Template not found." };
  }

  return createClarificationAction(projectId, {
    type,
    title: template.title,
    description: template.description,
    category: template.category,
    status: "draft",
  });
}
