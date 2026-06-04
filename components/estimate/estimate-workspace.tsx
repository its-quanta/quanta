"use client";

import { useCallback, useEffect, useState } from "react";

import { EstimateDetailPanel } from "@/components/estimate/estimate-detail-panel";
import type { DetailPanelSection } from "@/components/estimate/detail-package-section";
import { EstimateHeaderBar } from "@/components/estimate/estimate-header-bar";
import { EstimateItemTable } from "@/components/estimate/estimate-item-table";
import { EstimateSummaryStrip } from "@/components/estimate/estimate-summary-strip";
import { EstimateToast } from "@/components/estimate/estimate-toast";
import { useEstimateData } from "@/components/estimate/use-estimate-data";
import type { BuildUpPanelProps } from "@/components/projects/build-up-panel";
import type { EstimateItemStatus } from "@/src/lib/estimate/item-status";

type ToastState = {
  message: string;
  variant: "success" | "error";
  undo?: () => void;
};

export function EstimateWorkspace({
  projectId,
  takeoffItems,
  takeoffAssemblies: initialAssemblies,
  pricingItemsPlain: initialPricing,
  materialItems,
  labourItems,
  assemblyPackages,
  pricingTakeoffId,
  onPricingTakeoffConsumed,
  estimateLoadError,
  documents,
  onNavigateTab,
}: BuildUpPanelProps) {
  const { takeoffAssemblies, pricingItems, materialItems: liveMaterials, labourItems: liveLabour } =
    useEstimateData(
      projectId,
      initialAssemblies,
      initialPricing,
      materialItems,
      labourItems
    );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    pricingTakeoffId ?? null
  );
  const [panelOpen, setPanelOpen] = useState(pricingTakeoffId != null);
  const [statusFilter, setStatusFilter] = useState<EstimateItemStatus | null>(
    null
  );
  const [focusSection, setFocusSection] = useState<DetailPanelSection | null>(
    null
  );
  const [packagePickerOpen, setPackagePickerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const priceableCount = takeoffItems.filter(
    (item) => item.status !== "excluded"
  ).length;

  useEffect(() => {
    if (pricingTakeoffId) {
      setSelectedItemId(pricingTakeoffId);
      setPanelOpen(true);
      onPricingTakeoffConsumed?.();
    }
  }, [pricingTakeoffId, onPricingTakeoffConsumed]);

  const handleSelectItem = useCallback(
    (
      id: string,
      options?: {
        focusSection?: DetailPanelSection;
        openPackagePicker?: boolean;
      }
    ) => {
      setSelectedItemId(id);
      setPanelOpen(true);
      setFocusSection(options?.focusSection ?? "top");
      setPackagePickerOpen(options?.openPackagePicker ?? false);
    },
    []
  );

  const handleBadgeClick = useCallback(
    (itemId: string, status: EstimateItemStatus) => {
      if (status === "no_package") {
        handleSelectItem(itemId, {
          focusSection: "package",
          openPackagePicker: true,
        });
        return;
      }
      if (status === "no_sell_price" || status === "inverted") {
        handleSelectItem(itemId, { focusSection: "pricing" });
        return;
      }
      handleSelectItem(itemId, { focusSection: "top" });
    },
    [handleSelectItem]
  );

  const showToast = useCallback(
    (message: string, options?: { undo?: () => void }) => {
      setToast({ message, variant: "success", undo: options?.undo });
    },
    []
  );

  const showError = useCallback((message: string) => {
    setToast({ message, variant: "error" });
  }, []);

  return (
    <div className="flex min-h-[min(640px,calc(100vh-14rem))] flex-col overflow-hidden rounded-lg border border-border bg-background">
      {estimateLoadError ? (
        <div
          className="shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {estimateLoadError}
        </div>
      ) : null}

      <EstimateHeaderBar itemCount={priceableCount} />

      <EstimateSummaryStrip
        takeoffItems={takeoffItems}
        takeoffAssemblies={takeoffAssemblies}
        pricingItems={pricingItems}
        onFilterStatus={setStatusFilter}
        activeStatusFilter={statusFilter}
      />

      <div className="flex min-h-0 flex-1">
        <EstimateItemTable
          projectId={projectId}
          takeoffItems={takeoffItems}
          takeoffAssemblies={takeoffAssemblies}
          pricingItems={pricingItems}
          assemblyPackages={assemblyPackages}
          statusFilter={statusFilter}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          onBadgeClick={handleBadgeClick}
          onApplyError={showError}
        />
        {panelOpen && selectedItemId ? (
          <EstimateDetailPanel
            projectId={projectId}
            itemId={selectedItemId}
            takeoffItems={takeoffItems}
            takeoffAssemblies={takeoffAssemblies}
            pricingItems={pricingItems}
            assemblyPackages={assemblyPackages}
            focusSection={focusSection}
            packagePickerOpen={packagePickerOpen}
            onPackagePickerOpenChange={setPackagePickerOpen}
            materialItems={liveMaterials}
            labourItems={liveLabour}
            documents={documents}
            onViewInScope={() => onNavigateTab("scope")}
            onPackageChanged={() => {
              setFocusSection(null);
            }}
            onPricingSaved={() => {
              setFocusSection(null);
            }}
            onToast={showToast}
            onError={showError}
            onClose={() => setPanelOpen(false)}
          />
        ) : null}
      </div>

      <EstimateToast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onUndo={toast?.undo}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
