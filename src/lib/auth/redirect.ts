import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";

export async function resolvePostAuthRedirect(
  userId: string
): Promise<"/onboarding" | "/dashboard"> {
  const profile = await getProfileForUser(userId);

  if (!profile || !hasOrganisation(profile)) {
    return "/onboarding";
  }

  return "/dashboard";
}
