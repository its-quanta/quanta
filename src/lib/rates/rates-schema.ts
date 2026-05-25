import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMissingColumnError,
  isMissingTableError,
  isRlsPolicyError,
} from "@/src/lib/auth/profile-schema";
import type { OrganisationProfile } from "@/src/types/database";

/** Supabase/PostgREST table names (public schema). */
export const RATE_TABLES = {
  labour: "labour_rates",
  material: "material_rates",
  supplier: "supplier_rates",
  subcontractor: "subcontractor_rates",
} as const;

export type RateTableName = (typeof RATE_TABLES)[keyof typeof RATE_TABLES];

export type RateOrganisationContext =
  | { error: string }
  | { organisationId: string; profile: OrganisationProfile };

export function resolveRateOrganisationContext(
  profile: OrganisationProfile
): RateOrganisationContext {
  const organisationId = profile.organisation_id?.trim();

  if (!organisationId) {
    return {
      error:
        "Your profile has no organisation. Complete onboarding before saving rates.",
    };
  }

  return { organisationId, profile };
}

export function mapRateMutationError(
  table: RateTableName,
  message: string
): string {
  if (isMissingTableError(message)) {
    return `The ${table} table is not available to the API. In Supabase, confirm public.${table} exists, then reload the schema cache (Project Settings → API).`;
  }

  if (isRlsPolicyError(message)) {
    return `Save blocked by row-level security on ${table}. Sign in again, confirm your profile has an organisation, and ensure insert policies allow your organisation_id.`;
  }

  if (/organisation_id/i.test(message) && /null|required|violates/i.test(message)) {
    return "organisation_id is required. Your session may be missing an organisation — complete onboarding and try again.";
  }

  if (isMissingColumnError(message)) {
    return `A column on ${table} does not match the app schema. Compare your table with supabase/migrations/20260525200000_rate_libraries.sql. Details: ${message}`;
  }

  return message;
}

function stripMissingInsertColumn(
  payload: Record<string, unknown>,
  errorMessage: string
): Record<string, unknown> | null {
  const schemaCacheMatch = errorMessage.match(
    /Could not find the '([^']+)' column of/i
  );
  const postgresMatch = errorMessage.match(/column ([^\s]+) does not exist/i);
  const missingColumn = schemaCacheMatch?.[1] ?? postgresMatch?.[1];

  if (!missingColumn || !(missingColumn in payload)) {
    return null;
  }

  const { [missingColumn]: _removed, ...nextPayload } = payload;
  void _removed;
  return nextPayload;
}

export async function insertRateRow(
  supabase: SupabaseClient,
  table: RateTableName,
  payload: Record<string, unknown>
): Promise<{ id: string | null; error: string | null }> {
  if (!payload.organisation_id || typeof payload.organisation_id !== "string") {
    return {
      id: null,
      error:
        "organisation_id is required on every rate insert. Sign in and complete onboarding.",
    };
  }

  let attemptPayload = { ...payload };
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .insert(attemptPayload)
      .select("id")
      .single();

    if (!error) {
      return { id: data ? String(data.id) : null, error: null };
    }

    lastError = error.message;

    if (isMissingTableError(error.message) || isRlsPolicyError(error.message)) {
      break;
    }

    if (!isMissingColumnError(error.message)) {
      break;
    }

    const nextPayload = stripMissingInsertColumn(attemptPayload, error.message);
    if (!nextPayload) {
      break;
    }

    attemptPayload = nextPayload;
  }

  return {
    id: null,
    error: lastError ? mapRateMutationError(table, lastError) : "Save failed.",
  };
}

export async function updateRateRow(
  supabase: SupabaseClient,
  table: RateTableName,
  id: string,
  organisationId: string,
  payload: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (!error) {
    return { error: null };
  }

  return { error: mapRateMutationError(table, error.message) };
}

export async function deleteRateRow(
  supabase: SupabaseClient,
  table: RateTableName,
  id: string,
  organisationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (!error) {
    return { error: null };
  }

  return { error: mapRateMutationError(table, error.message) };
}

export async function getNextRateSortOrder(
  supabase: SupabaseClient,
  table: RateTableName,
  organisationId: string
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select("sort_order")
    .eq("organisation_id", organisationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) {
      return 0;
    }
    return 0;
  }

  return (data?.sort_order ?? -1) + 1;
}
