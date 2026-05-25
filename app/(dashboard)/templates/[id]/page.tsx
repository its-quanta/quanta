import Link from "next/link";
import { notFound } from "next/navigation";

import { AssemblyDetailWorkspace } from "@/components/assemblies/assembly-detail-workspace";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getAssemblyPackageDetail } from "@/src/lib/assemblies/queries";

type AssemblyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssemblyDetailPage({
  params,
}: AssemblyDetailPageProps) {
  const { profile } = await requireOrganisationProfile();
  const { id } = await params;

  const { assemblyPackage, items } = await getAssemblyPackageDetail(
    id,
    profile.organisation_id
  );

  if (!assemblyPackage) {
    notFound();
  }

  return (
    <>
      <AppTopBar
        title={assemblyPackage.name}
        description={`Priced package per ${assemblyPackage.unit}`}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="text-sm">
            <Link
              href="/templates"
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              ← Assembly library
            </Link>
          </div>
          <AssemblyDetailWorkspace
            assemblyPackage={assemblyPackage}
            items={items}
          />
        </div>
      </main>
    </>
  );
}
