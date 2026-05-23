import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RatesPage() {
  return (
    <>
      <AppTopBar
        title="Rates"
        description="Default labour rates and trade allowances"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <PageHeader
            title="Rates"
            description="Manage default labour rates used across new projects."
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisation rates</CardTitle>
              <CardDescription>
                Default labour rate, margin, and markup settings will be
                configured here in Settings.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </>
  );
}
