import { AppTopBar } from "@/components/layout/app-top-bar";
import { ActiveTenderWorkspace } from "@/components/dashboard/active-tender-workspace";
import { AiTenderInsightsPanel } from "@/components/dashboard/ai-tender-insights-panel";
import { CommercialPerformanceSection } from "@/components/dashboard/commercial-performance-section";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { PackageAssemblySection } from "@/components/dashboard/package-assembly-section";
import { RatesHealthSection } from "@/components/dashboard/rates-health-section";
import { TenderCommandHeader } from "@/components/dashboard/tender-command-header";
import { TenderMetricCards } from "@/components/dashboard/tender-metric-cards";
import { UpcomingDeadlinesSection } from "@/components/dashboard/upcoming-deadlines-section";
import { getTakeoffSummaryForOrganisation } from "@/src/lib/dashboard/queries";
import { buildTenderCommandCentreData } from "@/src/lib/dashboard/stats";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getProjectsForOrganisation } from "@/src/lib/projects/queries";
import { getRateLibrarySummary } from "@/src/lib/rates/queries";

export default async function DashboardPage() {
  const { profile } = await requireOrganisationProfile();
  const organisationId = profile.organisation_id;

  const [projects, takeoffRows, rateSummary] = await Promise.all([
    getProjectsForOrganisation(organisationId),
    getTakeoffSummaryForOrganisation(organisationId),
    getRateLibrarySummary(organisationId),
  ]);

  const data = buildTenderCommandCentreData(projects, takeoffRows, rateSummary);
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

          <DashboardSection
            title="Tender Pipeline Metrics"
            description="Active pipeline value, pricing progress, and scope gaps."
          >
            <TenderMetricCards metrics={data.pipelineMetrics} />
          </DashboardSection>

          <DashboardSection
            title="Active Tender Workspace"
            description="Stage, pricing coverage, risk, and value for each active tender."
          >
            <ActiveTenderWorkspace tenders={data.activeTenders} />
          </DashboardSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardSection
              title="AI Tender Insights"
              description="Draft insights for review — not final until verified."
            >
              <AiTenderInsightsPanel />
            </DashboardSection>

            <DashboardSection
              title="Upcoming Deadlines"
              description="Tender due dates in the next 14 days."
            >
              <UpcomingDeadlinesSection deadlines={data.upcomingDeadlines} />
            </DashboardSection>
          </div>

          <DashboardSection
            title="Package / Assembly Usage"
            description="Standard build-ups applied across your organisation."
          >
            <PackageAssemblySection />
          </DashboardSection>

          <DashboardSection
            title="Rates Health"
            description="Material, labour, and supplier rate libraries."
          >
            <RatesHealthSection metrics={data.ratesHealth} />
          </DashboardSection>

          <DashboardSection
            title="Commercial Performance"
            description="Margin, coverage, clarifications, and scope gaps."
          >
            <CommercialPerformanceSection metrics={data.commercialPerformance} />
          </DashboardSection>
        </div>
      </main>
    </>
  );
}
