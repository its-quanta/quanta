"use server";

import { revalidatePath } from "next/cache";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { createClient } from "@/src/lib/supabase/server";
import type {
  StandardInput,
  StandardLinkEntityType,
  StandardUpdate,
} from "@/src/types/database";

export type StandardActionResult = {
  error?: string;
  id?: string;
};

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

function revalidateStandardsPaths(projectId?: string | null) {
  revalidatePath("/standards");
  revalidatePath("/dashboard");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}

export async function createStandardAction(
  input: StandardInput
): Promise<StandardActionResult> {
  const { profile } = await requireOrganisationProfile();
  const reference = trimRequired(input.reference_code, "Reference code");
  const name = trimRequired(input.name, "Name");

  if (reference.error) {
    return { error: reference.error };
  }
  if (name.error) {
    return { error: name.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("standards")
    .insert({
      organisation_id: profile.organisation_id,
      reference_code: reference.value,
      name: name.value,
      standard_type: input.standard_type ?? "custom",
      trade: trimOptional(input.trade ?? null),
      jurisdiction: trimOptional(input.jurisdiction ?? null),
      description: trimOptional(input.description ?? null),
      notes: trimOptional(input.notes ?? null),
      source_url: trimOptional(input.source_url ?? null),
      is_active: input.is_active !== false,
    })
    .select("id")
    .single();

  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      return { error: "A standard with this reference code already exists." };
    }
    if (/relation .+ does not exist/i.test(error.message)) {
      return {
        error:
          "Standards library is not available yet. Run migration 20260526300000_standards_library.sql.",
      };
    }
    return { error: error.message };
  }

  revalidateStandardsPaths();
  return { id: data?.id };
}

export async function updateStandardAction(
  standardId: string,
  input: StandardUpdate
): Promise<StandardActionResult> {
  const { profile } = await requireOrganisationProfile();
  const payload: Record<string, unknown> = {};

  if (input.reference_code !== undefined) {
    const reference = trimRequired(input.reference_code, "Reference code");
    if (reference.error) {
      return { error: reference.error };
    }
    payload.reference_code = reference.value;
  }

  if (input.name !== undefined) {
    const name = trimRequired(input.name, "Name");
    if (name.error) {
      return { error: name.error };
    }
    payload.name = name.value;
  }

  if (input.standard_type !== undefined) {
    payload.standard_type = input.standard_type;
  }
  if (input.trade !== undefined) {
    payload.trade = trimOptional(input.trade);
  }
  if (input.jurisdiction !== undefined) {
    payload.jurisdiction = trimOptional(input.jurisdiction);
  }
  if (input.description !== undefined) {
    payload.description = trimOptional(input.description);
  }
  if (input.notes !== undefined) {
    payload.notes = trimOptional(input.notes);
  }
  if (input.source_url !== undefined) {
    payload.source_url = trimOptional(input.source_url);
  }
  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  if (Object.keys(payload).length === 0) {
    return {};
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("standards")
    .update(payload)
    .eq("id", standardId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      return { error: "A standard with this reference code already exists." };
    }
    return { error: error.message };
  }

  revalidateStandardsPaths();
  return {};
}

export async function deleteStandardAction(
  standardId: string
): Promise<StandardActionResult> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("standards")
    .delete()
    .eq("id", standardId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  revalidateStandardsPaths();
  return {};
}

export async function linkStandardAction(
  standardId: string,
  entityType: StandardLinkEntityType,
  entityId: string,
  projectId?: string | null
): Promise<StandardActionResult> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("standard_links")
    .insert({
      organisation_id: profile.organisation_id,
      standard_id: standardId,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      return { error: "This standard is already linked." };
    }
    if (/relation .+ does not exist/i.test(error.message)) {
      return {
        error:
          "Standard links are not available yet. Run migration 20260526300000_standards_library.sql.",
      };
    }
    return { error: error.message };
  }

  revalidateStandardsPaths(projectId);
  return { id: data?.id };
}

export async function unlinkStandardAction(
  linkId: string,
  projectId?: string | null
): Promise<StandardActionResult> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("standard_links")
    .delete()
    .eq("id", linkId)
    .eq("organisation_id", profile.organisation_id);

  if (error) {
    return { error: error.message };
  }

  revalidateStandardsPaths(projectId);
  return {};
}
