import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/src/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AppTopBar
        title="Settings"
        description="Organisation profile and estimating defaults"
        userEmail={user?.email}
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
                Profile and default pricing settings will save here once the
                organisation database is connected.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </>
  );
}
