"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { BulkActionBar } from "@/components/bulk-operations/bulk-action-bar";
import { useRowSelection } from "@/components/bulk-operations/use-row-selection";
import { EstimateBulkSheet } from "@/components/estimate/estimate-bulk-sheet";
import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { EstimateDetailPanel } from "@/components/estimate/estimate-detail-panel";
import type { DetailPanelSection } from "@/components/estimate/detail-package-section";
import { EstimateHeaderBar } from "@/components/estimate/estimate-header-bar";
import { EstimateItemTable } from "@/components/estimate/estimate-item-table";
import { EstimateSummaryStrip } from "@/components/estimate/estimate-summary-strip";
import { EstimateToast } from "@/components/estimate/estimate-toast";
import { useEstimateData } from "@/components/estimate/use-estimate-data";
import { Button } from "@/components/ui/button";
import type { BuildUpPanelProps } from "@/components/projects/build-up-panel";
import type { EstimateItemStatus } from "@/src/lib/estimate/item-status";
import {
  createPricingItemAction,
  updatePricingItemAction,
} from "@/src/lib/pricing/actions";
import type { PricingItem, TakeoffItem } from "@/src/types/database";

type ToastState = {
  message: string;
  variant: "success" | "error";
  undo?: () => void;
};

async function bulkMarkPricingMethod(
  projectId: string,
  items: TakeoffItem[],
  pricingByTakeoffId: Map<string, PricingItem>,
  method: "subcontractor_quote" | "allowance"
): Promise<{ successCount: number; failures: string[] }> {
  const results = await Promise.all(
    items.map(async (item) => {
      const existing = pricingByTakeoffId.get(item.id);
      const payload = {
        pricing_method: method,
        quantity: item.quantity,
        unit: item.unit?.trim() || "each",
        cost_rate: existing?.cost_rate ?? 0,
        sell_rate: existing?.sell_rate ?? 0,
        sell_rate_overridden: existing?.sell_rate_overridden ?? false,
      };

      const result = existing
        ? await updatePricingItemAction(existing.id, projectId, payload)
        : await createPricingItemAction(projectId, {
            takeoff_item_id: item.id,
            ...payload,
          });

      return {
        itemName: item.item_name,
        error: result.error,
      };
    })
  );

  const failures = results
    .filter((row) => row.error)
    .map((row) => `${row.itemName}: ${row.error}`);

  return {
    successCount: results.length - failures.length,
    failures,
  };
}

export function EstimateWorkspace({
  projectId,
  takeoffItems: initialTakeoffItems,
  takeoffAssemblies: initialAssemblies,
  pricingItemsPlain: initialPricing,
  materialItems,
  labourItems,
  assemblyPackages,
  documents,
  documentPages,
  pricingTakeoffId,
  onPricingTakeoffConsumed,
  estimateLoadError,
  onNavigateTab,
}: BuildUpPanelProps) {
  const {
    takeoffAssemblies,
    pricingItems,
    materialItems: liveMaterials,
    labourItems: liveLabour,
    optimisticRemoveMaterial,
    optimisticRemoveLabour,
  } = useEstimateData(
    projectId,
    initialAssemblies,
    initialPricing,
    materialItems,
    labourItems
  );

  const [liveTakeoffItems, setLiveTakeoffItems] = useState(initialTakeoffItems);

  useEffect(() => {
    setLiveTakeoffItems(initialTakeoffItems);
  }, [initialTakeoffItems]);

  const selection = useRowSelection();
  const [isBulkPending, startBulkTransition] = useTransition();

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
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const pricingByTakeoffId = useMemo(() => {
    const map = new Map<string, PricingItem>();
    for (const pricing of pricingItems) {
      map.set(pricing.takeoff_item_id, pricing);
    }
    return map;
  }, [pricingItems]);

  const selectedTakeoffItems = useMemo(
    () =>
      liveTakeoffItems.filter(
        (item) =>
          item.status !== "excluded" && selection.selectedIds.has(item.id)
      ),
    [liveTakeoffItems, selection.selectedIds]
  );

  const priceableCount = liveTakeoffItems.filter(
    (item) => item.status !== "excluded"
  ).length;

  const handleTakeoffItemSaved = useCallback((updated: TakeoffItem) => {
    setLiveTakeoffItems((current) =>
      current.map((row) => (row.id === updated.id ? updated : row))
    );
  }, []);

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

  const handleBulkPricingMethod = useCallback(
    (method: "subcontractor_quote" | "allowance") => {
      if (selectedTakeoffItems.length === 0) {
        return;
      }

      startBulkTransition(async () => {
        const { successCount, failures } = await bulkMarkPricingMethod(
          projectId,
          selectedTakeoffItems,
          pricingByTakeoffId,
          method
        );

        if (successCount > 0) {
          dispatchEstimateUpdated(projectId);
        }

        if (failures.length > 0) {
          showError(
            `${failures.length} item${failures.length === 1 ? "" : "s"} failed. ${failures.slice(0, 2).join(" ")}`
          );
        } else if (successCount > 0) {
          showToast(
            method === "subcontractor_quote"
              ? `${successCount} item${successCount === 1 ? "" : "s"} marked as quote.`
              : `${successCount} item${successCount === 1 ? "" : "s"} marked as allowance.`
          );
          selection.clearSelection();
        }
      });
    },
    [
      selectedTakeoffItems,
      projectId,
      pricingByTakeoffId,
      showError,
      showToast,
      selection,
    ]
  );

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
        takeoffItems={liveTakeoffItems}
        takeoffAssemblies={takeoffAssemblies}
        pricingItems={pricingItems}
        materialItems={liveMaterials}
        labourItems={liveLabour}
        assemblyPackages={assemblyPackages}
        onFilterStatus={setStatusFilter}
        activeStatusFilter={statusFilter}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <EstimateItemTable
            projectId={projectId}
            takeoffItems={liveTakeoffItems}
            takeoffAssemblies={takeoffAssemblies}
            pricingItems={pricingItems}
            materialItems={liveMaterials}
            labourItems={liveLabour}
            assemblyPackages={assemblyPackages}
            statusFilter={statusFilter}
            selectedItemId={selectedItemId}
            selection={selection}
            onSelectItem={handleSelectItem}
            onBadgeClick={handleBadgeClick}
            onApplyError={showError}
          />
          {panelOpen && selectedItemId ? (
            <EstimateDetailPanel
              projectId={projectId}
              itemId={selectedItemId}
              takeoffItems={liveTakeoffItems}
              takeoffAssemblies={takeoffAssemblies}
              pricingItems={pricingItems}
              assemblyPackages={assemblyPackages}
              focusSection={focusSection}
              packagePickerOpen={packagePickerOpen}
              onPackagePickerOpenChange={setPackagePickerOpen}
              materialItems={liveMaterials}
              labourItems={liveLabour}
              documents={documents}
              documentPages={documentPages}
              onViewInScope={() => onNavigateTab("scope")}
              onPackageChanged={() => {
                setFocusSection(null);
              }}
              onPricingSaved={() => {
                setFocusSection(null);
              }}
              onTakeoffItemSaved={handleTakeoffItemSaved}
              onOptimisticRemoveMaterial={optimisticRemoveMaterial}
              onOptimisticRemoveLabour={optimisticRemoveLabour}
              onToast={showToast}
              onError={showError}
              onClose={() => setPanelOpen(false)}
            />
          ) : null}
        </div>

        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClear={selection.clearSelection}
          className="mx-4 mb-4"
        >
          <Button
            type="button"
            size="sm"
            onClick={() => setBulkSheetOpen(true)}
            disabled={selection.selectedCount === 0}
          >
            Apply package
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkPending || selection.selectedCount === 0}
            onClick={() => handleBulkPricingMethod("subcontractor_quote")}
          >
            Mark as quote
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkPending || selection.selectedCount === 0}
            onClick={() => handleBulkPricingMethod("allowance")}
          >
            Mark as allowance
          </Button>
        </BulkActionBar>
      </div>

      <EstimateBulkSheet
        projectId={projectId}
        open={bulkSheetOpen}
        onOpenChange={setBulkSheetOpen}
        selectedItems={selectedTakeoffItems}
        assemblyPackages={assemblyPackages}
        onApplied={() => {
          showToast("Package applied to selected items.");
        }}
      />

      <EstimateToast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onUndo={toast?.undo}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
