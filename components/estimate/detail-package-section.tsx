"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { EstimatePackagePicker } from "@/components/estimate/estimate-package-picker";
import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/src/lib/format";
import {
  filterLabourForTakeoff,
  filterMaterialsForTakeoff,
} from "@/src/lib/estimate/build-up-totals";
import { formatComponentsSummary } from "@/src/lib/estimate/package-display";
import { fetchEstimateWorkspaceDataAction } from "@/src/lib/estimate/actions";
import {
  applyAssemblyPackageToTakeoffAction,
  removeAssemblyPackageFromTakeoffAction,
} from "@/src/lib/takeoff-assembly/actions";
import type {
  ApplyAssemblyPackageInput,
  AssemblyPackage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type DetailPanelSection = "package" | "pricing" | "top";

type DetailPackageSectionProps = {
  projectId: string;
  takeoffItem: TakeoffItem;
  assembly: TakeoffItemAssemblyWithPackage | null;
  pricing: PricingItem | null;
  assemblyPackages: AssemblyPackage[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
  onPackageChanged: () => void;
  onPriceManually?: () => void;
  onMarkAsQuote?: () => void;
  onMarkAsAllowance?: () => void;
  onToast: (message: string, options?: { undo?: () => void }) => void;
  onError: (message: string) => void;
  className?: string;
};

export function DetailPackageSection({
  projectId,
  takeoffItem,
  assembly,
  pricing,
  assemblyPackages,
  takeoffAssemblies,
  materialItems,
  labourItems,
  pickerOpen: pickerOpenProp,
  onPickerOpenChange,
  onPackageChanged,
  onPriceManually,
  onMarkAsQuote,
  onMarkAsAllowance,
  onToast,
  onError,
  className,
}: DetailPackageSectionProps) {
  const [pickerOpenInternal, setPickerOpenInternal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pickerOpen = pickerOpenProp ?? pickerOpenInternal;

  function setPickerOpen(open: boolean) {
    onPickerOpenChange?.(open);
    setPickerOpenInternal(open);
  }

  useEffect(() => {
    if (pickerOpenProp !== undefined) {
      setPickerOpenInternal(pickerOpenProp);
    }
  }, [pickerOpenProp]);

  const appliedPackage = assembly
    ? (assemblyPackages.find((pkg) => pkg.id === assembly.assembly_package_id) ??
      null)
    : null;

  const materialLines = useMemo(
    () => filterMaterialsForTakeoff(materialItems, takeoffItem.id),
    [materialItems, takeoffItem.id]
  );
  const labourLines = useMemo(
    () => filterLabourForTakeoff(labourItems, takeoffItem.id),
    [labourItems, takeoffItem.id]
  );

  const displayName =
    appliedPackage?.name ?? assembly?.assembly_package.name ?? "Package";
  const displayDescription = appliedPackage?.description?.trim() || null;
  const displayTrade = appliedPackage?.trade ?? takeoffItem.trade;
  const displayUnit = assembly?.unit ?? appliedPackage?.unit ?? takeoffItem.unit;
  const displayCostRate =
    appliedPackage?.default_cost_rate ??
    (assembly && assembly.quantity > 0
      ? assembly.calculated_cost / assembly.quantity
      : null);
  const displaySellRate =
    pricing?.sell_rate && pricing.sell_rate > 0
      ? pricing.sell_rate
      : appliedPackage?.default_sell_rate && appliedPackage.default_sell_rate > 0
        ? appliedPackage.default_sell_rate
        : null;

  const componentsSummary = formatComponentsSummary(
    materialLines.length,
    labourLines.length
  );

  function handleApplySuccess() {
    setPickerOpen(false);
    onPackageChanged();
    onToast("Package applied.");
  }

  function handleRemove() {
    if (!assembly) {
      return;
    }

    const undoPayload: ApplyAssemblyPackageInput = {
      takeoff_item_id: takeoffItem.id,
      assembly_package_id: assembly.assembly_package_id,
      quantity: assembly.quantity,
      unit: assembly.unit,
      replace_existing_pricing: true,
    };

    startTransition(async () => {
      const result = await removeAssemblyPackageFromTakeoffAction(
        projectId,
        takeoffItem.id
      );

      if (result.error) {
        onError(result.error);
        return;
      }

      dispatchEstimateUpdated(projectId);

      const refreshed = await fetchEstimateWorkspaceDataAction(projectId);
      const remainingMaterials = filterMaterialsForTakeoff(
        refreshed.materialItems,
        takeoffItem.id
      ).length;
      const remainingLabour = filterLabourForTakeoff(
        refreshed.labourItems,
        takeoffItem.id
      ).length;

      onPackageChanged();
      setPickerOpen(false);

      let message = "Package removed.";
      if (remainingMaterials + remainingLabour > 0) {
        message +=
          " Generated lines remain. Remove individually if required.";
      }

      onToast(message, {
        undo: () => {
          startTransition(async () => {
            const reapply = await applyAssemblyPackageToTakeoffAction(
              projectId,
              undoPayload
            );
            if (reapply.error) {
              onError(reapply.error);
              return;
            }
            dispatchEstimateUpdated(projectId);
            onPackageChanged();
            onToast("Package restored.");
          });
        },
      });
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!assembly ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No package applied</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => setPickerOpen(!pickerOpen)}
            >
              {pickerOpen ? "Hide picker" : "Apply package"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onPriceManually}
            >
              Price manually
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onMarkAsQuote}
            >
              Mark as quote
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onMarkAsAllowance}
            >
              Mark as allowance
            </Button>
          </div>
          {pickerOpen ? (
            <EstimatePackagePicker
              projectId={projectId}
              takeoffItem={takeoffItem}
              assemblyPackages={assemblyPackages}
              takeoffAssemblies={takeoffAssemblies}
              onApplied={handleApplySuccess}
              onError={onError}
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="flex items-start gap-1.5 text-sm font-medium leading-snug text-emerald-900">
              <span className="shrink-0" aria-hidden>
                ✓
              </span>
              <span>{displayName}</span>
            </p>
            {displayDescription ? (
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {displayDescription}
              </p>
            ) : null}
            <dl className="mt-3 grid gap-1.5 text-xs">
              <CardRow label="Trade" value={displayTrade || "—"} />
              <CardRow label="Unit" value={displayUnit || "—"} />
              <CardRow
                label="Cost rate"
                value={
                  displayCostRate != null
                    ? `${formatCurrency(displayCostRate)} / ${displayUnit}`
                    : "—"
                }
                mono
              />
              <CardRow
                label="Sell rate"
                value={
                  displaySellRate != null
                    ? `${formatCurrency(displaySellRate)} / ${displayUnit}`
                    : "—"
                }
                mono
              />
              <CardRow label="Components" value={componentsSummary} />
            </dl>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPickerOpen(!pickerOpen)}
            >
              {pickerOpen ? "Hide picker" : "Change package"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleRemove}
            >
              {isPending ? "Removing…" : "Remove package"}
            </Button>
          </div>

          {pickerOpen ? (
            <EstimatePackagePicker
              projectId={projectId}
              takeoffItem={takeoffItem}
              assemblyPackages={assemblyPackages}
              takeoffAssemblies={takeoffAssemblies}
              appliedAssemblyPackageId={assembly.assembly_package_id}
              onApplied={handleApplySuccess}
              onError={onError}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function CardRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "max-w-[14rem] truncate text-right",
          mono && "font-mono tabular-nums"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
