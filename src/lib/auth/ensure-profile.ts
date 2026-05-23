import type { User } from "@supabase/supabase-js";

import { createClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types/database";

import {
  normalizeProfile,
  queryProfileRow,
  type ProfileRow,
} from "@/src/lib/auth/profile-schema";

function fullNameFromUser(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fromMeta = metadata.full_name;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }

  return user.email?.split("@")[0] ?? "User";
}

function isMissingRpcError(message: string): boolean {
  return (
    /function public\.ensure_user_profile/i.test(message) ||
    /could not find the function/i.test(message)
  );
}

/**
 * Ensures the authenticated user has a profile row (without organisation).
 * Uses security definer RPC so onboarding works even when INSERT RLS is not applied.
 */
export async function ensureAuthProfile(user: User): Promise<Profile> {
  const supabase = await createClient();
  const { row: existing, error: selectError } = await queryProfileRow(
    supabase,
    user.id
  );

  if (selectError) {
    throw new Error(selectError);
  }

  if (existing) {
    return normalizeProfile(existing);
  }

  const fullName = fullNameFromUser(user);

  const { data, error: rpcError } = await supabase.rpc("ensure_user_profile", {
    p_full_name: fullName,
  });

  if (rpcError) {
    if (isMissingRpcError(rpcError.message)) {
      throw new Error(
        "Database onboarding function missing. Apply supabase/migrations/20260523150000_ensure_profile_rpc.sql in Supabase SQL Editor."
      );
    }

    throw new Error(rpcError.message);
  }

  if (!data) {
    const { row: racedProfile, error: racedError } = await queryProfileRow(
      supabase,
      user.id
    );

    if (racedError) {
      throw new Error(racedError);
    }

    if (racedProfile) {
      return normalizeProfile(racedProfile);
    }

    throw new Error("Could not create profile.");
  }

  return normalizeProfile(data as ProfileRow);
}

/** @deprecated Use ensureAuthProfile. Kept for imports during transition. */
export const ensureUserProfile = ensureAuthProfile;
