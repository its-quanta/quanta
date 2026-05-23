import Link from "next/link";

import { DashboardMetricCards } from "@/components/dashboard/metric-cards";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  return (
    <>
      <AppTopBar
        title="Dashboard"
        description="Overview of active tenders and pipeline"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Dashboard"
            description="Track live bids, deadlines, and tender activity."
            actions={
              <Button asChild>
                <Link href="/projects/new">Create project</Link>
              </Button>
            }
          />

          <DashboardMetricCards />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>
                Project updates and audit events will appear here once data is
                connected.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </>
  );
}
