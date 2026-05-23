import { redirect } from "next/navigation";

import { AuthProfileProvider } from "@/components/layout/auth-profile-provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ensureUserProfile } from "@/src/lib/auth/ensure-profile";
import { createClient } from "@/src/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile;

  try {
    profile = await ensureUserProfile(user);
  } catch {
    redirect("/login");
  }

  return (
    <AuthProfileProvider profile={profile}>
      <DashboardShell>{children}</DashboardShell>
    </AuthProfileProvider>
  );
}

export async function generateMetadata() {
  return {
    title: "Quanta",
  };
}
