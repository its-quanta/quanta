import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { AssemblyListTable } from "@/components/assemblies/assembly-list-table";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getAssemblyPackagesForOrganisation } from "@/src/lib/assemblies/queries";

export default async function TemplatesPage() {
  const { profile } = await requireOrganisationProfile();
  const packages = await getAssemblyPackagesForOrganisation(
    profile.organisation_id
  );

  return (
    <>
      <AppTopBar
        title="Assemblies"
        description="Reusable pricing packages for materials, labour, and allowances"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Assembly library"
            description="Build priced packages per unit of measure. Components roll up to cost and sell rates — review before use on a tender."
          />
          <AssemblyListTable packages={packages} />
        </div>
      </main>
    </>
  );
}
