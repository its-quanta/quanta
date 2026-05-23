import Link from "next/link";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyProjectList } from "@/components/projects/empty-project-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/src/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AppTopBar
        title="Projects"
        description="Tender estimates and job workspaces"
        userEmail={user?.email}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Projects"
            description="Manage tender estimates from takeoff through to export."
            actions={
              <Button asChild>
                <Link href="/projects/new">Create project</Link>
              </Button>
            }
          />

          <EmptyProjectList />
        </div>
      </main>
    </>
  );
}
