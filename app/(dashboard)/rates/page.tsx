import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { RatesWorkspace } from "@/components/rates/rates-workspace";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getRateLibrariesForOrganisation } from "@/src/lib/rates/queries";

type RatesPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function RatesPage({ searchParams }: RatesPageProps) {
  const { profile } = await requireOrganisationProfile();
  const { tab } = await searchParams;

  const {
    labourRates,
    materialRates,
    supplierRates,
    subcontractorRates,
    summary,
  } = await getRateLibrariesForOrganisation(profile.organisation_id);

  return (
    <>
      <AppTopBar
        title="Rates"
        description="Organisation rate libraries for labour, materials, and suppliers"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Rate libraries"
            description="Maintain standard labour, material, supplier, and subcontractor rates. Apply on tenders when pricing — review before use."
          />
          <RatesWorkspace
            initialTab={tab}
            labourRates={labourRates}
            materialRates={materialRates}
            supplierRates={supplierRates}
            subcontractorRates={subcontractorRates}
            summary={summary}
          />
        </div>
      </main>
    </>
  );
}
