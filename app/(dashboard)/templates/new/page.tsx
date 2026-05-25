import Link from "next/link";

import { AssemblyCreateForm } from "@/components/assemblies/assembly-create-form";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";

export default async function NewAssemblyPage() {
  await requireOrganisationProfile();

  return (
    <>
      <AppTopBar
        title="New assembly"
        description="Create a reusable pricing package"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <PageHeader
            title="Create assembly"
            description="Enter package details, then add material, labour, plant, subcontractor, and allowance components."
          />
          <AssemblyCreateForm />
          <Button variant="outline" asChild>
            <Link href="/templates">Cancel</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
