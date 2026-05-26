import { AuthProfileProvider } from "@/components/layout/auth-profile-provider";
import { OrganisationSettingsProvider } from "@/components/layout/organisation-settings-provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getOrganisationById } from "@/src/lib/organisations/queries";
import { toOrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireOrganisationProfile();
  const organisation =
    (await getOrganisationById(profile.organisation_id)) ?? {
      id: profile.organisation_id,
      name: "Organisation",
      country: null,
      currency: null,
      tax_rate: null,
      default_margin_percentage: null,
      default_markup_percentage: null,
      default_labour_cost_rate: null,
      default_labour_charge_rate: null,
    };

  return (
    <AuthProfileProvider profile={profile}>
      <OrganisationSettingsProvider
        settings={toOrganisationSettingsSnapshot(organisation)}
      >
        <DashboardShell>{children}</DashboardShell>
      </OrganisationSettingsProvider>
    </AuthProfileProvider>
  );
}

export async function generateMetadata() {
  return {
    title: "Quanta",
  };
}
