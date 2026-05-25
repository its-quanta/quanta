"use client";

import { useEffect, useMemo, useState } from "react";

import { ApplyPackageDialog } from "@/components/takeoff/apply-package-dialog";
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
import type {
  AssemblyPackage,
  PricingItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ProjectPricingPanelProps = {
  projectId: string;
  pricingItems: PricingItemWithTakeoff[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  pricingItemsPlain: PricingItem[];
  initialTakeoffItemId?: string | null;
  onInitialTakeoffConsumed?: () => void;
};

export function ProjectPricingPanel({
  projectId,
  pricingItems,
  takeoffItems,
  takeoffAssemblies,
  assemblyPackages,
  pricingItemsPlain,
  initialTakeoffItemId,
  onInitialTakeoffConsumed,
}: ProjectPricingPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [applyPackageItem, setApplyPackageItem] = useState<TakeoffItem | null>(
    null
  );
  const [addDialogTakeoffId, setAddDialogTakeoffId] = useState<string | null>(
    null
  );

  const takeoffAssembliesByItemId = useMemo(
    () =>
      new Map(
        takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [takeoffAssemblies]
  );

  useEffect(() => {
    if (!initialTakeoffItemId) {
      return;
    }

    setAddDialogTakeoffId(initialTakeoffItemId);
    setAddDialogOpen(true);
    onInitialTakeoffConsumed?.();
  }, [initialTakeoffItemId, onInitialTakeoffConsumed]);

  const pricingByTakeoffId = useMemo(
    () =>
      new Map(
        pricingItemsPlain.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [pricingItemsPlain]
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
    setAddDialogTakeoffId(takeoffItemId ?? null);
    setAddDialogOpen(true);
  }

  function openApplyPackage(takeoffItemId: string) {
    const takeoff = takeoffItems.find((item) => item.id === takeoffItemId);
    if (takeoff) {
      setApplyPackageItem(takeoff);
    }
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
            takeoffAssemblies={takeoffAssemblies}
            onAddPricing={() => openAddPricing()}
          />
        </CardContent>
      </Card>

      <UnpricedTakeoffSection
        items={unpricedItems}
        onAddPricing={(takeoffItemId) => openAddPricing(takeoffItemId)}
        onApplyPackage={openApplyPackage}
        canApplyPackage={assemblyPackages.length > 0}
      />

      <ApplyPackageDialog
        projectId={projectId}
        takeoffItem={applyPackageItem}
        existingAssembly={
          applyPackageItem
            ? (takeoffAssembliesByItemId.get(applyPackageItem.id) ?? null)
            : null
        }
        assemblyPackages={assemblyPackages}
        existingPricing={
          applyPackageItem
            ? (pricingByTakeoffId.get(applyPackageItem.id) ?? null)
            : null
        }
        open={Boolean(applyPackageItem)}
        onOpenChange={(open) => {
          if (!open) {
            setApplyPackageItem(null);
          }
        }}
      />

      <AddPricingItemDialog
        projectId={projectId}
        takeoffItems={takeoffItems}
        pricedTakeoffIds={pricedTakeoffIds}
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setAddDialogTakeoffId(null);
          }
        }}
        initialTakeoffItemId={addDialogTakeoffId}
      />
    </div>
  );
}
