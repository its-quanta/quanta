"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import { calculateEstimateItemPricing } from "@/src/lib/estimate/item-pricing";
import {
  deriveItemStatus,
  type EstimateItemStatus,
} from "@/src/lib/estimate/item-status";
import type {
  AssemblyPackage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type EstimateSummaryStripProps = {
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  assemblyPackages: AssemblyPackage[];
  onFilterStatus: (status: EstimateItemStatus | null) => void;
  activeStatusFilter: EstimateItemStatus | null;
};

export function EstimateSummaryStrip({
  takeoffItems,
  takeoffAssemblies,
  pricingItems,
  materialItems,
  labourItems,
  assemblyPackages,
  onFilterStatus,
  activeStatusFilter,
}: EstimateSummaryStripProps) {
  const assemblyByTakeoffId = useMemo(() => {
    const map = new Map<string, TakeoffItemAssemblyWithPackage>();
    for (const assembly of takeoffAssemblies) {
      map.set(assembly.takeoff_item_id, assembly);
    }
    return map;
  }, [takeoffAssemblies]);

  const pricingByTakeoffId = useMemo(() => {
    const map = new Map<string, PricingItem>();
    for (const pricing of pricingItems) {
      map.set(pricing.takeoff_item_id, pricing);
    }
    return map;
  }, [pricingItems]);

  const priceableItems = useMemo(
    () => takeoffItems.filter((item) => item.status !== "excluded"),
    [takeoffItems]
  );

  const packageById = useMemo(() => {
    const map = new Map<string, AssemblyPackage>();
    for (const pkg of assemblyPackages) {
      map.set(pkg.id, pkg);
    }
    return map;
  }, [assemblyPackages]);

  const counts = useMemo(() => {
    const result = {
      no_package: 0,
      no_sell_price: 0,
      ready: 0,
      quote: 0,
    };

    for (const item of priceableItems) {
      const assembly = assemblyByTakeoffId.get(item.id);
      const pricing = pricingByTakeoffId.get(item.id);
      const appliedPackage = assembly
        ? (packageById.get(assembly.assembly_package_id) ?? null)
        : null;
      const calculated = calculateEstimateItemPricing({
        takeoffItem: item,
        materialItems,
        labourItems,
        pricingItem: pricing ?? null,
        packageAssembly: assembly ?? null,
        appliedPackage,
      });
      const status = deriveItemStatus(
        item,
        assembly,
        pricing,
        {
          totalCost: calculated.totalCost,
          totalSell: calculated.totalSell,
          sellRate: calculated.sellRate,
        }
      );
      if (status === "no_package") {
        result.no_package += 1;
      } else if (status === "no_sell_price") {
        result.no_sell_price += 1;
      } else if (status === "ready") {
        result.ready += 1;
      } else if (status === "quote") {
        result.quote += 1;
      }
    }

    return result;
  }, [
    priceableItems,
    assemblyByTakeoffId,
    pricingByTakeoffId,
    packageById,
    materialItems,
    labourItems,
  ]);

  const totals = useMemo(() => {
    let cost = 0;
    let sell = 0;
    let hasCost = false;
    let hasSell = false;

    for (const item of priceableItems) {
      const assembly = assemblyByTakeoffId.get(item.id);
      const pricing = pricingByTakeoffId.get(item.id);
      if (!assembly && !pricing) {
        continue;
      }

      const appliedPackage = assembly
        ? (packageById.get(assembly.assembly_package_id) ?? null)
        : null;
      const calculated = calculateEstimateItemPricing({
        takeoffItem: item,
        materialItems,
        labourItems,
        pricingItem: pricing ?? null,
        packageAssembly: assembly ?? null,
        appliedPackage,
      });

      if (calculated.totalCost > 0 || pricing) {
        cost += calculated.totalCost;
        hasCost = true;
      }
      if (calculated.totalSell > 0) {
        sell += calculated.totalSell;
        hasSell = true;
      }
    }

    const marginPercent =
      hasSell && sell > 0 ? ((sell - cost) / sell) * 100 : null;

    return {
      cost: hasCost ? cost : null,
      sell: hasSell ? sell : null,
      marginPercent,
    };
  }, [
    priceableItems,
    assemblyByTakeoffId,
    pricingByTakeoffId,
    packageById,
    materialItems,
    labourItems,
  ]);

  function toggleFilter(status: EstimateItemStatus) {
    onFilterStatus(activeStatusFilter === status ? null : status);
  }

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-4 border-b border-border px-4 text-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground">
        <StatusCountButton
          label={`○ ${counts.no_package} no package`}
          active={activeStatusFilter === "no_package"}
          onClick={() => toggleFilter("no_package")}
        />
        <span aria-hidden className="text-border">
          ·
        </span>
        <StatusCountButton
          label={`⚠ ${counts.no_sell_price} need sell`}
          active={activeStatusFilter === "no_sell_price"}
          onClick={() => toggleFilter("no_sell_price")}
        />
        <span aria-hidden className="text-border">
          ·
        </span>
        <StatusCountButton
          label={`✓ ${counts.ready} ready`}
          active={activeStatusFilter === "ready"}
          onClick={() => toggleFilter("ready")}
        />
        <span aria-hidden className="text-border">
          ·
        </span>
        <StatusCountButton
          label={`Q ${counts.quote} quote`}
          active={activeStatusFilter === "quote"}
          onClick={() => toggleFilter("quote")}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 font-mono tabular-nums text-muted-foreground">
        <span>Cost: {formatCurrency(totals.cost)}</span>
        <span aria-hidden>·</span>
        <span>Sell: {formatCurrency(totals.sell)}</span>
        <span aria-hidden>·</span>
        <span>Margin: {formatPercent(totals.marginPercent)}</span>
      </div>
    </div>
  );
}

function StatusCountButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-1 py-0.5 transition-colors hover:text-foreground",
        active && "bg-muted font-medium text-foreground"
      )}
    >
      {label}
    </button>
  );
}
