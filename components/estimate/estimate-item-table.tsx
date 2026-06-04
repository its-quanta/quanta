"use client";

import { useMemo, useTransition } from "react";

import { RowSelectionCheckbox } from "@/components/bulk-operations/row-selection-checkbox";
import { useRowSelection } from "@/components/bulk-operations/use-row-selection";
import type { DetailPanelSection } from "@/components/estimate/detail-package-section";
import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { EstimatePackageColumnCell } from "@/components/estimate/estimate-package-column-cell";
import { EstimateStatusBadge } from "@/components/estimate/estimate-status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatQuantity } from "@/src/lib/format";
import {
  deriveItemStatus,
  deriveRowMarginPercent,
  type EstimateItemStatus,
} from "@/src/lib/estimate/item-status";
import {
  getSingleTradePackageMatch,
  hasMultipleTradePackageMatches,
} from "@/src/lib/estimate/package-suggestions";
import { applyAssemblyPackageToTakeoffAction } from "@/src/lib/takeoff-assembly/actions";
import type {
  AssemblyPackage,
  PricingItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type EstimateItemTableProps = {
  projectId: string;
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  assemblyPackages: AssemblyPackage[];
  statusFilter: EstimateItemStatus | null;
  selectedItemId: string | null;
  onSelectItem: (
    id: string,
    options?: {
      focusSection?: DetailPanelSection;
      openPackagePicker?: boolean;
    }
  ) => void;
  onBadgeClick: (itemId: string, status: EstimateItemStatus) => void;
  onApplyError?: (message: string) => void;
};

export function EstimateItemTable({
  projectId,
  takeoffItems,
  takeoffAssemblies,
  pricingItems,
  assemblyPackages,
  statusFilter,
  selectedItemId,
  onSelectItem,
  onBadgeClick,
  onApplyError,
}: EstimateItemTableProps) {
  const selection = useRowSelection();
  const [isApplying, startTransition] = useTransition();

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

  const visibleItems = useMemo(() => {
    return takeoffItems
      .filter((item) => item.status !== "excluded")
      .filter((item) => {
        if (!statusFilter) {
          return true;
        }
        const status = deriveItemStatus(
          item,
          assemblyByTakeoffId.get(item.id),
          pricingByTakeoffId.get(item.id)
        );
        return status === statusFilter;
      });
  }, [
    takeoffItems,
    statusFilter,
    assemblyByTakeoffId,
    pricingByTakeoffId,
  ]);

  const visibleIds = useMemo(
    () => visibleItems.map((item) => item.id),
    [visibleItems]
  );

  function applySmartPackage(item: TakeoffItem, pkg: AssemblyPackage) {
    startTransition(async () => {
      const result = await applyAssemblyPackageToTakeoffAction(projectId, {
        takeoff_item_id: item.id,
        assembly_package_id: pkg.id,
        quantity: item.quantity,
        unit: item.unit?.trim() || pkg.unit || "each",
        replace_existing_pricing: true,
      });

      if (result.error) {
        onApplyError?.(result.error);
        return;
      }
      dispatchEstimateUpdated(projectId);
    });
  }

  if (visibleItems.length === 0) {
    const hasItems = takeoffItems.some((item) => item.status !== "excluded");
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {!hasItems
            ? "No scope items yet. Complete the Scope stage first."
            : statusFilter
              ? "No items match this filter."
              : "No items to display."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-8">
                <RowSelectionCheckbox
                  checked={selection.getHeaderCheckboxState(visibleIds)}
                  onChange={() => selection.selectAllVisible(visibleIds)}
                  ariaLabel="Select all items"
                />
              </TableHead>
              <TableHead className="w-12">Status</TableHead>
              <TableHead className="min-w-[180px]">Item</TableHead>
              <TableHead className="w-[100px]">Trade</TableHead>
              <TableHead className="w-[72px] text-right">Qty</TableHead>
              <TableHead className="w-[52px]">Unit</TableHead>
              <TableHead className="w-[130px]">Package</TableHead>
              <TableHead className="w-[88px] text-right">Cost</TableHead>
              <TableHead className="w-[88px] text-right">Sell</TableHead>
              <TableHead className="w-[68px] text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => {
              const assembly = assemblyByTakeoffId.get(item.id);
              const pricing = pricingByTakeoffId.get(item.id);
              const status = deriveItemStatus(item, assembly, pricing);
              const marginPercent = deriveRowMarginPercent(pricing);
              const isSelected = selectedItemId === item.id;
              const appliedPackage = assembly
                ? (assemblyPackages.find(
                    (pkg) => pkg.id === assembly.assembly_package_id
                  ) ?? null)
                : null;
              const singleMatch =
                !assembly && getSingleTradePackageMatch(item, assemblyPackages);
              const multipleMatches =
                !assembly &&
                hasMultipleTradePackageMatches(item, assemblyPackages);

              return (
                <TableRow
                  key={item.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "border-l-2 border-l-primary bg-primary/5"
                  )}
                  onClick={() => onSelectItem(item.id)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <RowSelectionCheckbox
                      checked={selection.isSelected(item.id)}
                      onChange={() =>
                        selection.handleRowSelect(item.id, visibleIds)
                      }
                      ariaLabel={`Select ${item.item_name}`}
                    />
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <EstimateStatusBadge
                      status={status}
                      onClick={() => onBadgeClick(item.id, status)}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="truncate font-medium">{item.item_name}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.trade || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatQuantity(item.quantity)}
                  </TableCell>
                  <TableCell>{item.unit || "—"}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {assembly ? (
                      <EstimatePackageColumnCell
                        assembly={assembly}
                        appliedPackage={appliedPackage}
                        pricing={pricing}
                      />
                    ) : singleMatch ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 max-w-full truncate px-2 text-xs"
                        disabled={isApplying}
                        onClick={() => applySmartPackage(item, singleMatch)}
                      >
                        Apply: {singleMatch.name}
                      </Button>
                    ) : multipleMatches ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          onSelectItem(item.id, {
                            focusSection: "package",
                            openPackagePicker: true,
                          })
                        }
                      >
                        Choose package
                      </Button>
                    ) : (
                      <EstimatePackageColumnCell
                        assembly={undefined}
                        appliedPackage={null}
                        pricing={pricing}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(pricing?.total_cost ?? null)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(pricing?.total_sell ?? null)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      marginPercent !== null &&
                        marginPercent < 0 &&
                        "text-red-800",
                      marginPercent !== null &&
                        marginPercent >= 0 &&
                        "text-emerald-800"
                    )}
                  >
                    {formatPercent(marginPercent)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
