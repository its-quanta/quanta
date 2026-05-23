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

export default function TeamSettingsPage() {
  return (
    <>
      <AppTopBar
        title="Team"
        description="Organisation members and invites"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Team"
            description="Manage who can access your organisation workspace."
            actions={
              <Button variant="outline" asChild>
                <Link href="/settings">Back to settings</Link>
              </Button>
            }
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team invites</CardTitle>
              <CardDescription>
                Full team management is not available yet. Invites can be
                accepted during onboarding using an invite token. Creating and
                revoking invites from this page will connect in a later phase.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </>
  );
}
