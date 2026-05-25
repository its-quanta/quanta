"use client";

import { useMemo, useState } from "react";

import { AddPricingItemDialog } from "@/components/pricing/add-pricing-item-dialog";
import { PricingSummaryCards } from "@/components/pricing/pricing-summary-cards";
import { PricingTable } from "@/components/pricing/pricing-table";
import { UnpricedTakeoffSection } from "@/components/pricing/unpriced-takeoff-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import {
  computePricingSummary,
  getPricedTakeoffIds,
  getUnpricedTakeoffItems,
} from "@/src/lib/pricing/summary";
import type { TakeoffItem } from "@/src/types/database";

type ProjectPricingPanelProps = {
  projectId: string;
  pricingItems: PricingItemWithTakeoff[];
  takeoffItems: TakeoffItem[];
};

export function ProjectPricingPanel({
  projectId,
  pricingItems,
  takeoffItems,
}: ProjectPricingPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [initialTakeoffItemId, setInitialTakeoffItemId] = useState<string | null>(
    null
  );

  const pricedTakeoffIds = useMemo(
    () => getPricedTakeoffIds(pricingItems),
    [pricingItems]
  );

  const unpricedItems = useMemo(
    () => getUnpricedTakeoffItems(takeoffItems, pricedTakeoffIds),
    [takeoffItems, pricedTakeoffIds]
  );

  const summary = useMemo(
    () => computePricingSummary(pricingItems, takeoffItems),
    [pricingItems, takeoffItems]
  );

  function openAddPricing(takeoffItemId?: string) {
    setInitialTakeoffItemId(takeoffItemId ?? null);
    setAddDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <PricingSummaryCards totals={summary} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing workspace</CardTitle>
          <CardDescription>
            Build sell price from takeoff quantities. Margin is on sell; markup
            is on cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingTable
            projectId={projectId}
            pricingItems={pricingItems}
            onAddPricing={() => openAddPricing()}
          />
        </CardContent>
      </Card>

      <UnpricedTakeoffSection
        items={unpricedItems}
        onAddPricing={(takeoffItemId) => openAddPricing(takeoffItemId)}
      />

      <AddPricingItemDialog
        projectId={projectId}
        takeoffItems={takeoffItems}
        pricedTakeoffIds={pricedTakeoffIds}
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setInitialTakeoffItemId(null);
          }
        }}
        initialTakeoffItemId={initialTakeoffItemId}
      />
    </div>
  );
}
