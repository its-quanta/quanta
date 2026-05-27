import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { ImportsWorkspace } from "@/components/imports/imports-workspace";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getImportBatchesForOrganisation } from "@/src/lib/imports/queries";

export default async function ImportsPage() {
  const { profile } = await requireOrganisationProfile();
  const history = await getImportBatchesForOrganisation(profile.organisation_id);

  return (
    <>
      <AppTopBar
        title="Imports"
        description="Bulk import rates, packages, standards, and templates from CSV or Excel"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Bulk import"
            description="Migrate existing estimating data into Quanta. Map columns, validate rows, and import with duplicate control — no AI or PDF processing."
          />
          <ImportsWorkspace history={history} />
        </div>
      </main>
    </>
  );
}
