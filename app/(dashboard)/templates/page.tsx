import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/src/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AppTopBar
        title="Templates"
        description="Reusable exclusions, assumptions, and scope blocks"
        userEmail={user?.email}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Templates"
            description="Save and reuse tender wording across projects."
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No templates yet</CardTitle>
              <CardDescription>
                Template library will connect once organisation settings are in
                place.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </>
  );
}
