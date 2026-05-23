import { redirect } from "next/navigation";

import { OnboardingPanel } from "@/components/onboarding/onboarding-panel";
import { ensureAuthProfile } from "@/src/lib/auth/ensure-profile";
import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { createClient } from "@/src/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let setupError: string | null = null;

  try {
    await ensureAuthProfile(user);
  } catch (error) {
    setupError =
      error instanceof Error
        ? error.message
        : "Could not prepare your account for onboarding.";
  }

  const profile = setupError ? null : await getProfileForUser(user.id);

  if (profile && hasOrganisation(profile)) {
    redirect("/dashboard");
  }

  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataFullName =
    typeof metadata.full_name === "string" ? metadata.full_name : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
            Q
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Set up your organisation
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new organisation or join an existing team to access Quanta.
          </p>
        </div>

        {setupError ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Account setup failed
              </CardTitle>
              <CardDescription>{setupError}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <OnboardingPanel
            defaultFullName={profile?.full_name ?? metadataFullName}
            defaultEmail={user.email}
          />
        )}
      </div>
    </div>
  );
}
