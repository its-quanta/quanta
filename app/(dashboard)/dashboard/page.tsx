import { AppTopBar } from "@/components/layout/app-top-bar";
import { QuickToolsSection } from "@/components/dashboard/quick-tools-section";
import { RecentProjectsSection } from "@/components/dashboard/recent-projects-section";
import { TenderCommandHeader } from "@/components/dashboard/tender-command-header";
import { TenderInsightCards } from "@/components/dashboard/tender-insight-cards";
import { TenderMetricCards } from "@/components/dashboard/tender-metric-cards";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { buildDashboardStats } from "@/src/lib/dashboard/stats";
import { getProjectsForOrganisation } from "@/src/lib/projects/queries";

export default async function DashboardPage() {
  const { profile } = await requireOrganisationProfile();
  const projects = await getProjectsForOrganisation(profile.organisation_id);
  const stats = buildDashboardStats(projects);
  const welcomeName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <AppTopBar
        title="Tender Command Centre"
        description="Pipeline, deadlines, and tender progress"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <TenderCommandHeader welcomeName={welcomeName} />

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">Pipeline</h2>
              <p className="text-sm text-muted-foreground">
                Tender counts and values across your organisation.
              </p>
            </div>
            <TenderMetricCards metrics={stats.metrics} />
          </section>

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                Tender insights
              </h2>
              <p className="text-sm text-muted-foreground">
                Deadlines, review queues, and risk flags for active tenders.
              </p>
            </div>
            <TenderInsightCards insights={stats.insights} />
          </section>

          <QuickToolsSection />

          <RecentProjectsSection projects={stats.recentProjects} />
        </div>
      </main>
    </>
  );
}
