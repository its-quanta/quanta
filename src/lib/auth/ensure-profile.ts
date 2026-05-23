import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types/database";

function organisationNameFromUser(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fromMeta = metadata.organisation_name;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }

  const fullName = metadata.full_name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return `${fullName.trim()} Organisation`;
  }

  const emailPrefix = user.email?.split("@")[0] ?? "User";
  return `${emailPrefix} Organisation`;
}

function fullNameFromUser(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fromMeta = metadata.full_name;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }

  return user.email?.split("@")[0] ?? "User";
}

/**
 * Ensures the authenticated user has a profile and default organisation.
 * Idempotent — safe to call after sign-in and on protected layout load.
 */
export async function ensureUserProfile(user: User): Promise<Profile> {
  const supabase = await createClient();

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, email, full_name, organisation_id, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    return existing as Profile;
  }

  const admin = createAdminClient();
  const orgName = organisationNameFromUser(user);
  const fullName = fullNameFromUser(user);

  const { data: organisation, error: orgError } = await admin
    .from("organisations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !organisation) {
    throw new Error(orgError?.message ?? "Could not create organisation.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      organisation_id: organisation.id,
      role: "owner",
    })
    .select("id, email, full_name, organisation_id, role, created_at, updated_at")
    .single();

  if (profileError || !profile) {
    if (profileError?.code === "23505") {
      const { data: racedProfile, error: racedError } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, organisation_id, role, created_at, updated_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (racedError) {
        throw new Error(racedError.message);
      }

      if (racedProfile) {
        return racedProfile as Profile;
      }
    }

    throw new Error(profileError?.message ?? "Could not create profile.");
  }

  return profile as Profile;
}
