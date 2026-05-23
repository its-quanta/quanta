import Link from "next/link";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyProjectList } from "@/components/projects/empty-project-list";
import { ProjectTable } from "@/components/projects/project-table";
import { Button } from "@/components/ui/button";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getProjectsForOrganisation } from "@/src/lib/projects/queries";

export default async function ProjectsPage() {
  const { profile } = await requireOrganisationProfile();
  const projects = await getProjectsForOrganisation(profile.organisation_id);

  return (
    <>
      <AppTopBar
        title="Projects"
        description="Tender estimates and job workspaces"
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

          {projects.length === 0 ? (
            <EmptyProjectList />
          ) : (
            <ProjectTable projects={projects} />
          )}
        </div>
      </main>
    </>
  );
}
