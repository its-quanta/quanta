import { AuthProfileProvider } from "@/components/layout/auth-profile-provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireOrganisationProfile();

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
