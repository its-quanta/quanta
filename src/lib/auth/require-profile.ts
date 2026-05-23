import { redirect } from "next/navigation";

import { ensureAuthProfile } from "@/src/lib/auth/ensure-profile";
import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { createClient } from "@/src/lib/supabase/server";
import type { OrganisationProfile, Profile } from "@/src/types/database";
import type { User } from "@supabase/supabase-js";

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireProfile(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await requireUser();
  let profile = await getProfileForUser(user.id);

  if (!profile) {
    profile = await ensureAuthProfile(user);
  }

  return { user, profile };
}

export async function requireOrganisationProfile(): Promise<{
  user: User;
  profile: OrganisationProfile;
}> {
  const { user, profile } = await requireProfile();

  if (!hasOrganisation(profile)) {
    redirect("/onboarding");
  }

  return {
    user,
    profile: profile as OrganisationProfile,
  };
}
