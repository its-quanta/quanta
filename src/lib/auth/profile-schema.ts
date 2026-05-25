import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PROFILE_ROLES,
  type Profile,
  type ProfileRole,
} from "@/src/types/database";

/** Fields required for auth, tenancy, and UI. */
export const PROFILE_CORE_SELECT =
  "id, email, full_name, organisation_id, role" as const;

/** Optional audit timestamps when present in the database. */
export const PROFILE_EXTENDED_SELECT =
  `${PROFILE_CORE_SELECT}, created_at, updated_at` as const;

export const PROFILE_ORG_SELECT = "organisation_id" as const;

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  organisation_id: string | null;
  role: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function isMissingColumnError(message: string): boolean {
  return (
    /column .+ does not exist/i.test(message) ||
    /Could not find the '.+' column of/i.test(message)
  );
}

export function isRlsPolicyError(message: string): boolean {
  return /row-level security policy/i.test(message);
}

export function normalizeProfileRole(
  role: string | null | undefined
): ProfileRole | null {
  if (!role) {
    return null;
  }

  if ((PROFILE_ROLES as readonly string[]).includes(role)) {
    return role as ProfileRole;
  }

  return "viewer";
}

export function normalizeProfile(row: ProfileRow): Profile {
  const profile: Profile = {
    id: row.id,
    email: row.email ?? "",
    full_name: row.full_name ?? null,
    organisation_id: row.organisation_id ?? null,
    role: normalizeProfileRole(row.role),
  };

  if (row.created_at) {
    profile.created_at = row.created_at;
  }

  if (row.updated_at) {
    profile.updated_at = row.updated_at;
  }

  return profile;
}

export function hasOrganisation(
  profile: Profile
): profile is Profile & { organisation_id: string; role: ProfileRole } {
  return Boolean(profile.organisation_id && profile.role);
}

export async function queryProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<{ row: ProfileRow | null; error: string | null }> {
  const extended = await supabase
    .from("profiles")
    .select(PROFILE_EXTENDED_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!extended.error) {
    return { row: (extended.data as ProfileRow | null) ?? null, error: null };
  }

  if (isMissingColumnError(extended.error.message)) {
    const core = await supabase
      .from("profiles")
      .select(PROFILE_CORE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (core.error) {
      return { row: null, error: core.error.message };
    }

    return { row: (core.data as ProfileRow | null) ?? null, error: null };
  }

  return { row: null, error: extended.error.message };
}

export async function queryProfileOrganisationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_ORG_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as { organisation_id: string | null } | null)?.organisation_id ?? null;
}

/** Fields required when reading organisation rows. */
export const ORGANISATION_CORE_SELECT = "id, name" as const;

export const ORGANISATION_EXTENDED_SELECT =
  `${ORGANISATION_CORE_SELECT}, created_at, updated_at` as const;

export type OrganisationRow = {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export function normalizeOrganisation(row: OrganisationRow) {
  return {
    id: row.id,
    name: row.name,
    ...(row.created_at ? { created_at: row.created_at } : {}),
    ...(row.updated_at ? { updated_at: row.updated_at } : {}),
  };
}
