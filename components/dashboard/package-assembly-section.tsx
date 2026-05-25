import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveAssemblyCount } from "@/src/lib/assemblies/queries";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";

export async function PackageAssemblySection() {
  const { profile } = await requireOrganisationProfile();
  const count = await getActiveAssemblyCount(profile.organisation_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Package / assembly library
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reusable priced build-ups across your organisation.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {count}
            </p>
            <p className="text-sm text-muted-foreground">Active assemblies</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/templates">Open assemblies</Link>
          </Button>
        </div>
        {/* TODO: Track apply-to-takeoff usage when explosion ships. */}
      </CardContent>
    </Card>
  );
}
