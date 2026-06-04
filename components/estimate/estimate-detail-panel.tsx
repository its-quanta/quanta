"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DetailPackageSection,
  type DetailPanelSection,
} from "@/components/estimate/detail-package-section";
import { DetailLabourSection } from "@/components/estimate/detail-labour-section";
import { DetailMaterialsSection } from "@/components/estimate/detail-materials-section";
import { DetailPricingSection } from "@/components/estimate/detail-pricing-section";
import { DetailSourceSection } from "@/components/estimate/detail-source-section";
import { EstimateCollapsibleSection } from "@/components/estimate/estimate-collapsible-section";
import { EstimateStatusBadge } from "@/components/estimate/estimate-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatQuantity } from "@/src/lib/format";
import { computeBuildUpTotals } from "@/src/lib/estimate/build-up-totals";
import {
  deriveItemStatus,
  type EstimateItemStatus,
} from "@/src/lib/estimate/item-status";
import type { EstimatePricingModeOverride } from "@/src/lib/estimate/pricing-derivation";
import type {
  AssemblyPackage,
  Document,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type EstimateDetailPanelProps = {
  projectId: string;
  itemId: string;
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  assemblyPackages: AssemblyPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  documents: Document[];
  focusSection?: DetailPanelSection | null;
  packagePickerOpen?: boolean;
  onPackagePickerOpenChange?: (open: boolean) => void;
  onPackageChanged: () => void;
  onPricingSaved: () => void;
  onViewInScope?: () => void;
  onToast: (message: string, options?: { undo?: () => void }) => void;
  onError: (message: string) => void;
  onClose: () => void;
  className?: string;
};

export function EstimateDetailPanel({
  projectId,
  itemId,
  takeoffItems,
  takeoffAssemblies,
  pricingItems,
  assemblyPackages,
  materialItems,
  labourItems,
  documents,
  focusSection,
  packagePickerOpen,
  onPackagePickerOpenChange,
  onPackageChanged,
  onPricingSaved,
  onViewInScope,
  onToast,
  onError,
  onClose,
  className,
}: EstimateDetailPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pricingModeOverride, setPricingModeOverride] =
    useState<EstimatePricingModeOverride | null>(null);

  const item = useMemo(
    () => takeoffItems.find((row) => row.id === itemId) ?? null,
    [takeoffItems, itemId]
  );

  const assembly = useMemo(
    () =>
      takeoffAssemblies.find((row) => row.takeoff_item_id === itemId) ?? null,
    [takeoffAssemblies, itemId]
  );

  const pricing = useMemo(
    () => pricingItems.find((row) => row.takeoff_item_id === itemId) ?? null,
    [pricingItems, itemId]
  );

  const appliedPackage = useMemo(
    () =>
      assembly
        ? (assemblyPackages.find(
            (pkg) => pkg.id === assembly.assembly_package_id
          ) ?? null)
        : null,
    [assembly, assemblyPackages]
  );

  const buildUp = useMemo(() => {
    if (!item) {
      return null;
    }
    return computeBuildUpTotals({
      materialItems,
      labourItems,
      takeoffItemId: item.id,
      quantity: item.quantity,
    });
  }, [item, materialItems, labourItems]);

  const itemStatus = useMemo(
    (): EstimateItemStatus | null =>
      item ? deriveItemStatus(item, assembly ?? undefined, pricing ?? undefined) : null,
    [item, assembly, pricing]
  );

  useEffect(() => {
    setPricingModeOverride(null);
  }, [itemId]);

  useEffect(() => {
    if (!focusSection || !scrollRef.current) {
      return;
    }

    const targetId =
      focusSection === "package"
        ? "estimate-section-package"
        : focusSection === "pricing"
          ? "estimate-section-pricing"
          : null;

    if (!targetId) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const element = scrollRef.current.querySelector(`#${targetId}`);
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusSection, itemId]);

  function requestPricingMode(mode: EstimatePricingModeOverride) {
    setPricingModeOverride(mode);
    const element = scrollRef.current?.querySelector("#estimate-section-pricing");
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (!item || !buildUp) {
    return null;
  }

  const materialsSummary =
    buildUp.materialLines.length > 0
      ? formatCurrency(buildUp.materialsTotal)
      : undefined;
  const labourSummary =
    buildUp.labourLines.length > 0
      ? formatCurrency(buildUp.labourTotal)
      : undefined;

  return (
    <aside
      className={cn(
        "flex h-full w-[400px] shrink-0 flex-col border-l border-border bg-card",
        className
      )}
    >
      <div className="sticky top-0 z-10 flex shrink-0 items-start gap-2 border-b border-border bg-card p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 font-mono"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          ›
        </Button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-sm font-medium leading-snug">{item.item_name}</h3>
          <p className="text-xs text-muted-foreground">
            {item.trade || "—"} · {formatQuantity(item.quantity)} {item.unit}
          </p>
          {itemStatus ? (
            <EstimateStatusBadge status={itemStatus} className="max-w-full" />
          ) : null}
          {assembly ? (
            <p className="truncate text-xs font-medium text-emerald-800">
              ✓ {appliedPackage?.name ?? assembly.assembly_package.name}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onClose}
          aria-label="Dismiss panel"
        >
          ✕
        </Button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        <EstimateCollapsibleSection
          id="estimate-section-package"
          title="Package"
          defaultOpen
          className="border-t-0 pt-0"
        >
          <DetailPackageSection
            projectId={projectId}
            takeoffItem={item}
            assembly={assembly}
            pricing={pricing}
            assemblyPackages={assemblyPackages}
            takeoffAssemblies={takeoffAssemblies}
            materialItems={materialItems}
            labourItems={labourItems}
            pickerOpen={packagePickerOpen}
            onPickerOpenChange={onPackagePickerOpenChange}
            onPackageChanged={onPackageChanged}
            onPriceManually={() => requestPricingMode("manual")}
            onMarkAsQuote={() => requestPricingMode("quote")}
            onMarkAsAllowance={() => requestPricingMode("allowance")}
            onToast={onToast}
            onError={onError}
          />
        </EstimateCollapsibleSection>

        <EstimateCollapsibleSection
          id="estimate-section-materials"
          title="Materials"
          summary={materialsSummary}
          defaultOpen={buildUp.materialLines.length > 0}
        >
          <DetailMaterialsSection
            projectId={projectId}
            takeoffItemId={item.id}
            materialItems={materialItems}
            onError={onError}
          />
        </EstimateCollapsibleSection>

        <EstimateCollapsibleSection
          id="estimate-section-labour"
          title="Labour"
          summary={labourSummary}
          defaultOpen={buildUp.labourLines.length > 0}
        >
          <DetailLabourSection
            projectId={projectId}
            takeoffItemId={item.id}
            labourItems={labourItems}
            onError={onError}
          />
        </EstimateCollapsibleSection>

        <EstimateCollapsibleSection
          id="estimate-section-pricing"
          title="Pricing"
          defaultOpen
        >
          <DetailPricingSection
            projectId={projectId}
            takeoffItem={item}
            assembly={assembly}
            pricing={pricing}
            appliedPackage={appliedPackage}
            materialItems={materialItems}
            labourItems={labourItems}
            modeOverride={pricingModeOverride}
            focusSellRate={itemStatus === "no_sell_price"}
            showPackageComponentsWarning={
              assembly !== null &&
              buildUp.materialLines.length === 0 &&
              buildUp.labourLines.length === 0
            }
            onPricingSaved={onPricingSaved}
            onError={onError}
          />
        </EstimateCollapsibleSection>

        <EstimateCollapsibleSection
          id="estimate-section-source"
          title="Source"
          defaultOpen={false}
        >
          <DetailSourceSection
            takeoffItem={item}
            documents={documents}
            onViewInScope={onViewInScope}
          />
        </EstimateCollapsibleSection>
      </div>
    </aside>
  );
}
