import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { StandardsWorkspace } from "@/components/standards/standards-workspace";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getStandardsForOrganisation } from "@/src/lib/standards/queries";

export default async function StandardsPage() {
  const { profile } = await requireOrganisationProfile();
  const standards = await getStandardsForOrganisation(profile.organisation_id);

  return (
    <>
      <AppTopBar
        title="Standards"
        description="Organisation reference library for codes, specs, and citations"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Standards library"
            description="Maintain reference codes and link them to takeoff items, assembly packages, and pricing lines. Scope gap detection flags missing standards on takeoff."
          />
          <StandardsWorkspace standards={standards} />
        </div>
      </main>
    </>
  );
}
