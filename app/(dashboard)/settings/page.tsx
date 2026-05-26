import Link from "next/link";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { OrganisationSettingsForm } from "@/components/settings/organisation-settings-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getOrganisationById } from "@/src/lib/organisations/queries";

export default async function SettingsPage() {
  const { profile } = await requireOrganisationProfile();
  const organisation = await getOrganisationById(profile.organisation_id);

  if (!organisation) {
    return (
      <>
        <AppTopBar
          title="Settings"
          description="Organisation profile and estimating defaults"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-destructive">
            Could not load organisation settings.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppTopBar
        title="Settings"
        description="Organisation profile and estimating defaults"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <PageHeader
            title="Settings"
            description="Organisation profile, localisation, and default rates."
          />

          <OrganisationSettingsForm organisation={organisation} />

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Team</CardTitle>
                <CardDescription>
                  Invite estimators and viewers to your organisation.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/team">Open team settings</Link>
              </Button>
            </CardHeader>
          </Card>
        </div>
      </main>
    </>
  );
}
