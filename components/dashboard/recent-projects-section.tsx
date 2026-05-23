import Link from "next/link";

import { ProjectCard } from "@/components/projects/project-card";
import { EmptyProjectList } from "@/components/projects/empty-project-list";
import { Button } from "@/components/ui/button";
import type { Project } from "@/src/types/database";

type RecentProjectsSectionProps = {
  projects: Project[];
};

export function RecentProjectsSection({ projects }: RecentProjectsSectionProps) {
  if (projects.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Recent projects
            </h2>
            <p className="text-sm text-muted-foreground">
              Your latest tender workspaces.
            </p>
          </div>
        </div>
        <EmptyProjectList />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Recent projects</h2>
          <p className="text-sm text-muted-foreground">
            Latest tender workspaces for your organisation.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/projects">View all</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
