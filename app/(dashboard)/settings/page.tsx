import Link from "next/link";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <AppTopBar
        title="Settings"
        description="Organisation profile and estimating defaults"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Settings"
            description="Organisation profile, default rates, and margins."
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisation settings</CardTitle>
              <CardDescription>
                Profile and default pricing settings will save here in a later
                phase.
              </CardDescription>
            </CardHeader>
          </Card>
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
