"use client";

import { useMemo, useState, useTransition } from "react";

import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/src/lib/format";
import {
  bulkApplyGroupKey,
  formatSelectedItemPreview,
  groupItemsByTrade,
  packagesForTrade,
} from "@/src/lib/estimate/bulk-apply";
import { applyAssemblyPackageToTakeoffAction } from "@/src/lib/takeoff-assembly/actions";
import type { AssemblyPackage, TakeoffItem } from "@/src/types/database";

type ApplyFailure = {
  itemId: string;
  itemName: string;
  error: string;
};

type GroupApplyState = {
  status: "idle" | "applying" | "applied" | "partial";
  successCount: number;
  failures: ApplyFailure[];
};

type EstimateBulkSheetProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: TakeoffItem[];
  assemblyPackages: AssemblyPackage[];
  onApplied?: () => void;
};

export function EstimateBulkSheet({
  projectId,
  open,
  onOpenChange,
  selectedItems,
  assemblyPackages,
  onApplied,
}: EstimateBulkSheetProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [groupStates, setGroupStates] = useState<Record<string, GroupApplyState>>(
    {}
  );

  const tradeGroups = useMemo(
    () => groupItemsByTrade(selectedItems),
    [selectedItems]
  );

  const itemPreview = useMemo(
    () => formatSelectedItemPreview(selectedItems),
    [selectedItems]
  );

  const filteredTradeGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tradeGroups;
    }

    return tradeGroups.filter((group) => {
      const packages = packagesForTrade(assemblyPackages, group.trade);
      return (
        group.trade.toLowerCase().includes(query) ||
        group.items.some((item) =>
          item.item_name.toLowerCase().includes(query)
        ) ||
        packages.some((pkg) => {
          const haystack = [pkg.name, pkg.trade, pkg.description, pkg.unit]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      );
    });
  }, [tradeGroups, assemblyPackages, search]);

  function packagesForGroup(trade: string) {
    const packages = packagesForTrade(assemblyPackages, trade);
    const query = search.trim().toLowerCase();
    if (!query) {
      return packages;
    }
    return packages.filter((pkg) => {
      const haystack = [pkg.name, pkg.trade, pkg.description, pkg.unit]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  function resetStatesOnClose(nextOpen: boolean) {
    if (!nextOpen) {
      setSearch("");
      setGroupStates({});
    }
    onOpenChange(nextOpen);
  }

  function applyPackageToItems(
    trade: string,
    pkg: AssemblyPackage,
    items: TakeoffItem[]
  ) {
    const key = bulkApplyGroupKey(trade, pkg.id);

    setGroupStates((current) => ({
      ...current,
      [key]: {
        status: "applying",
        successCount: 0,
        failures: current[key]?.failures ?? [],
      },
    }));

    startTransition(async () => {
      const results = await Promise.all(
        items.map(async (item) => {
          const result = await applyAssemblyPackageToTakeoffAction(projectId, {
            takeoff_item_id: item.id,
            assembly_package_id: pkg.id,
            quantity: item.quantity,
            unit: item.unit?.trim() || pkg.unit || "each",
            replace_existing_pricing: true,
          });

          return {
            itemId: item.id,
            itemName: item.item_name,
            error: result.error,
          };
        })
      );

      const failures = results
        .filter((row) => row.error)
        .map((row) => ({
          itemId: row.itemId,
          itemName: row.itemName,
          error: row.error!,
        }));
      const successCount = results.length - failures.length;

      if (successCount > 0) {
        dispatchEstimateUpdated(projectId);
        onApplied?.();
      }

      setGroupStates((current) => ({
        ...current,
        [key]: {
          status:
            failures.length === 0
              ? "applied"
              : successCount > 0
                ? "partial"
                : "idle",
          successCount,
          failures,
        },
      }));
    });
  }

  function retryFailures(
    trade: string,
    pkg: AssemblyPackage,
    failures: ApplyFailure[]
  ) {
    const items = selectedItems.filter((item) =>
      failures.some((failure) => failure.itemId === item.id)
    );
    if (items.length === 0) {
      return;
    }
    applyPackageToItems(trade, pkg, items);
  }

  const totalFailures = useMemo(
    () =>
      Object.values(groupStates).reduce(
        (sum, state) => sum + state.failures.length,
        0
      ),
    [groupStates]
  );

  return (
    <Sheet open={open} onOpenChange={resetStatesOnClose}>
      <SheetContent
        side="bottom"
        className="max-h-[min(85vh,720px)] gap-0 overflow-hidden p-0 sm:max-w-none"
        showCloseButton
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="text-base">
            Apply package to {selectedItems.length} item
            {selectedItems.length === 1 ? "" : "s"}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {itemPreview}
          </SheetDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            {tradeGroups.map((group) => (
              <span
                key={group.trade}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium"
              >
                {group.trade} × {group.items.length}
              </span>
            ))}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search packages…"
            className="mb-4 h-9"
            aria-label="Search packages"
          />

          {totalFailures > 0 ? (
            <div
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {totalFailures} item{totalFailures === 1 ? "" : "s"} failed to
              apply. Successful applications are kept. Retry failed items below.
            </div>
          ) : null}

          <div className="space-y-6">
            {filteredTradeGroups.map((group) => {
              const packages = packagesForGroup(group.trade);

              return (
                <section key={group.trade} className="space-y-3">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.trade}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} selected item
                      {group.items.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  {packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No packages match this trade.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {packages.map((pkg) => {
                        const key = bulkApplyGroupKey(group.trade, pkg.id);
                        const state = groupStates[key] ?? {
                          status: "idle" as const,
                          successCount: 0,
                          failures: [],
                        };
                        const isApplying =
                          isPending && state.status === "applying";
                        const targetCount = group.items.length;

                        return (
                          <li
                            key={pkg.id}
                            className="rounded-lg border border-border bg-card p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{pkg.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {formatCurrency(pkg.default_cost_rate)} /{" "}
                                  {pkg.unit}
                                  {pkg.default_sell_rate > 0
                                    ? ` · sell ${formatCurrency(pkg.default_sell_rate)}`
                                    : null}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Applies to {targetCount} item
                                  {targetCount === 1 ? "" : "s"} in{" "}
                                  {group.trade}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  state.status === "applied"
                                    ? "secondary"
                                    : "default"
                                }
                                disabled={
                                  isApplying ||
                                  state.status === "applied" ||
                                  state.status === "partial"
                                }
                                className={cn(
                                  "shrink-0",
                                  (state.status === "applied" ||
                                    state.status === "partial") &&
                                    "text-emerald-800"
                                )}
                                onClick={() =>
                                  applyPackageToItems(
                                    group.trade,
                                    pkg,
                                    group.items
                                  )
                                }
                              >
                                {isApplying
                                  ? "Applying…"
                                  : state.status === "applied"
                                    ? `✓ Applied to ${state.successCount} items`
                                    : state.status === "partial"
                                      ? `✓ Applied to ${state.successCount} items`
                                      : `Apply to ${targetCount} items`}
                              </Button>
                            </div>

                            {state.status === "partial" &&
                            state.failures.length > 0 ? (
                              <div className="mt-3 space-y-2 border-t border-border pt-3">
                                <ul className="space-y-1 text-xs text-destructive">
                                  {state.failures.map((failure) => (
                                    <li key={failure.itemId}>
                                      {failure.itemName}: {failure.error}
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isApplying}
                                  onClick={() =>
                                    retryFailures(group.trade, pkg, state.failures)
                                  }
                                >
                                  Retry failed items
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <SheetFooter className="border-t border-border px-4 py-3">
          <Button type="button" onClick={() => resetStatesOnClose(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
