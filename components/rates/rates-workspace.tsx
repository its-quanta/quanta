"use client";

import { useRouter } from "next/navigation";

import { LabourRatesPanel } from "@/components/rates/labour-rates-panel";
import { MaterialRatesPanel } from "@/components/rates/material-rates-panel";
import { RateDashboardPanel } from "@/components/rates/rate-dashboard-panel";
import { SubcontractorRatesPanel } from "@/components/rates/subcontractor-rates-panel";
import { SupplierRatesPanel } from "@/components/rates/supplier-rates-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RateLibrarySummary } from "@/src/lib/rates/queries";
import type {
  LabourRate,
  MaterialRate,
  SubcontractorRate,
  SupplierRate,
} from "@/src/types/database";

const RATE_TABS = [
  { value: "dashboard", label: "Rate dashboard" },
  { value: "labour", label: "Labour rates" },
  { value: "material", label: "Material rates" },
  { value: "supplier", label: "Supplier rates" },
  { value: "subcontractor", label: "Subcontractor rates" },
] as const;

export type RateTabValue = (typeof RATE_TABS)[number]["value"];

function isValidTab(value: string | undefined): value is RateTabValue {
  return RATE_TABS.some((tab) => tab.value === value);
}

type RatesWorkspaceProps = {
  initialTab?: string;
  labourRates: LabourRate[];
  materialRates: MaterialRate[];
  supplierRates: SupplierRate[];
  subcontractorRates: SubcontractorRate[];
  summary: RateLibrarySummary;
};

export function RatesWorkspace({
  initialTab,
  labourRates,
  materialRates,
  supplierRates,
  subcontractorRates,
  summary,
}: RatesWorkspaceProps) {
  const router = useRouter();
  const activeTab: RateTabValue = isValidTab(initialTab) ? initialTab : "dashboard";

  function handleTabChange(value: string) {
    if (!isValidTab(value)) {
      return;
    }

    if (value === "dashboard") {
      router.push("/rates");
      return;
    }

    router.push(`/rates?tab=${value}`);
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex flex-col gap-6"
    >
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {RATE_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="px-3 py-2 text-sm"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="dashboard" className="mt-0">
        <RateDashboardPanel summary={summary} />
      </TabsContent>

      <TabsContent value="labour" className="mt-0">
        <LabourRatesPanel initialRates={labourRates} />
      </TabsContent>

      <TabsContent value="material" className="mt-0">
        <MaterialRatesPanel initialRates={materialRates} />
      </TabsContent>

      <TabsContent value="supplier" className="mt-0">
        <SupplierRatesPanel initialRates={supplierRates} />
      </TabsContent>

      <TabsContent value="subcontractor" className="mt-0">
        <SubcontractorRatesPanel initialRates={subcontractorRates} />
      </TabsContent>
    </Tabs>
  );
}
