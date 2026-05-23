import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { CreateProjectForm } from "@/components/projects/create-project-form";

export default async function NewProjectPage() {
  return (
    <>
      <AppTopBar
        title="New project"
        description="Create a tender workspace"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Create project"
            description="Start a new tender estimate. Fields will save once the projects database is connected."
          />
          <CreateProjectForm />
        </div>
      </main>
    </>
  );
}
