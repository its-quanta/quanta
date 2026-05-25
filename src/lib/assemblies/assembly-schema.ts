import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMissingColumnError,
  isMissingTableError,
  isRlsPolicyError,
} from "@/src/lib/auth/profile-schema";
import type { OrganisationProfile, Profile } from "@/src/types/database";

export const ASSEMBLY_PACKAGE_TABLE = "assembly_packages" as const;
export const ASSEMBLY_ITEM_TABLE = "assembly_package_items" as const;

export type AssemblyOrganisationContext =
  | { error: string }
  | { organisationId: string; profile: Profile | OrganisationProfile };

export function resolveAssemblyOrganisationContext(
  profile: Profile | OrganisationProfile
): AssemblyOrganisationContext {
  const organisationId = profile.organisation_id?.trim();

  if (!organisationId) {
    return {
      error:
        "Your profile has no organisation. Complete onboarding before saving assemblies.",
    };
  }

  return { organisationId, profile };
}

export function mapAssemblyMutationError(
  table: typeof ASSEMBLY_PACKAGE_TABLE | typeof ASSEMBLY_ITEM_TABLE,
  message: string
): string {
  if (isMissingTableError(message)) {
    return `The ${table} table is not available. Confirm it exists in Supabase and reload the API schema cache.`;
  }

  if (isRlsPolicyError(message)) {
    return `Could not save to ${table}. Sign in with an account linked to an organisation, and confirm table grants and RLS policies for authenticated users (see supabase/migrations/20260525230000_assembly_packages_grants_rls_rpc.sql).`;
  }

  if (isMissingColumnError(message)) {
    return `A column on ${table} does not match the app schema. See supabase/migrations/20260525220000_assembly_packages.sql. ${message}`;
  }

  if (/Not authenticated/i.test(message)) {
    return "You must be signed in to save assemblies.";
  }

  if (/Complete onboarding/i.test(message)) {
    return message;
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

async function verifyAssemblyInsertSession(
  supabase: SupabaseClient
): Promise<{ error: string } | { organisationId: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to save assemblies." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "Could not load your profile. Try again." };
  }

  if (!profile) {
    return {
      error:
        "Your profile is missing. Complete onboarding before saving assemblies.",
    };
  }

  const organisationId = profile.organisation_id?.trim();
  if (!organisationId) {
    return {
      error:
        "Your profile has no organisation. Complete onboarding before saving assemblies.",
    };
  }

  return { organisationId };
}

async function insertAssemblyPackageViaRpc(
  supabase: SupabaseClient,
  packageId: string,
  payload: Record<string, unknown>
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_assembly_package", {
    p_package_id: packageId,
    p_name: String(payload.name ?? ""),
    p_description: (payload.description as string | null) ?? null,
    p_trade: (payload.trade as string | null) ?? null,
    p_unit: String(payload.unit ?? "m2"),
    p_default_cost_rate: Number(payload.default_cost_rate ?? 0),
    p_default_sell_rate: Number(payload.default_sell_rate ?? 0),
    p_default_markup_percentage:
      (payload.default_markup_percentage as number | null) ?? null,
    p_default_margin_percentage:
      (payload.default_margin_percentage as number | null) ?? null,
    p_standard_reference:
      (payload.standard_reference as string | null) ?? null,
    p_specification_reference:
      (payload.specification_reference as string | null) ?? null,
    p_notes: (payload.notes as string | null) ?? null,
    p_is_active: payload.is_active !== false,
  });

  if (error) {
    return {
      id: null,
      error: mapAssemblyMutationError(ASSEMBLY_PACKAGE_TABLE, error.message),
    };
  }

  const id = data != null ? String(data) : packageId;
  return { id, error: null };
}

async function insertAssemblyPackageItemViaRpc(
  supabase: SupabaseClient,
  itemId: string,
  payload: Record<string, unknown>
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_assembly_package_item", {
    p_item_id: itemId,
    p_assembly_package_id: String(payload.assembly_package_id),
    p_item_type: String(payload.item_type ?? "material"),
    p_item_name: String(payload.item_name ?? ""),
    p_quantity_per_unit: Number(payload.quantity_per_unit ?? 0),
    p_unit: String(payload.unit ?? "each"),
    p_wastage_percentage: Number(payload.wastage_percentage ?? 0),
    p_cost_rate: Number(payload.cost_rate ?? 0),
    p_sell_rate: (payload.sell_rate as number | null) ?? null,
    p_total_cost_per_unit: Number(payload.total_cost_per_unit ?? 0),
    p_notes: (payload.notes as string | null) ?? null,
  });

  if (error) {
    return {
      id: null,
      error: mapAssemblyMutationError(ASSEMBLY_ITEM_TABLE, error.message),
    };
  }

  const id = data != null ? String(data) : itemId;
  return { id, error: null };
}

export async function insertAssemblyRow(
  supabase: SupabaseClient,
  table: typeof ASSEMBLY_PACKAGE_TABLE | typeof ASSEMBLY_ITEM_TABLE,
  payload: Record<string, unknown>
): Promise<{ id: string | null; error: string | null }> {
  const session = await verifyAssemblyInsertSession(supabase);
  if ("error" in session) {
    return { id: null, error: session.error };
  }

  let attemptPayload: Record<string, unknown> = {
    ...payload,
    id: randomUUID(),
    organisation_id: session.organisationId,
  };

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rowId =
      typeof attemptPayload.id === "string" ? attemptPayload.id : randomUUID();
    attemptPayload = { ...attemptPayload, id: rowId };

    const { error: insertError } = await supabase
      .from(table)
      .insert(attemptPayload);

    if (!insertError) {
      return { id: rowId, error: null };
    }

    lastError = insertError.message;

    if (isRlsPolicyError(insertError.message)) {
      if (table === ASSEMBLY_PACKAGE_TABLE) {
        return insertAssemblyPackageViaRpc(supabase, rowId, attemptPayload);
      }
      if (table === ASSEMBLY_ITEM_TABLE) {
        return insertAssemblyPackageItemViaRpc(supabase, rowId, attemptPayload);
      }
      break;
    }

    if (isMissingTableError(insertError.message)) {
      break;
    }

    if (!isMissingColumnError(insertError.message)) {
      break;
    }

    const nextPayload = stripMissingInsertColumn(
      attemptPayload,
      insertError.message
    );
    if (!nextPayload) {
      break;
    }

    attemptPayload = nextPayload;
  }

  return {
    id: null,
    error: lastError
      ? mapAssemblyMutationError(table, lastError)
      : "Save failed.",
  };
}

export async function updateAssemblyRow(
  supabase: SupabaseClient,
  table: typeof ASSEMBLY_PACKAGE_TABLE | typeof ASSEMBLY_ITEM_TABLE,
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

  return { error: mapAssemblyMutationError(table, error.message) };
}

export async function deleteAssemblyRow(
  supabase: SupabaseClient,
  table: typeof ASSEMBLY_PACKAGE_TABLE | typeof ASSEMBLY_ITEM_TABLE,
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

  return { error: mapAssemblyMutationError(table, error.message) };
}
