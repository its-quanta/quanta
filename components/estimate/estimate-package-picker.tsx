"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/src/lib/format";
import { applyAssemblyPackageToTakeoffAction } from "@/src/lib/takeoff-assembly/actions";
import type {
  AssemblyPackage,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type EstimatePackagePickerProps = {
  projectId: string;
  takeoffItem: TakeoffItem;
  assemblyPackages: AssemblyPackage[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  appliedAssemblyPackageId?: string | null;
  onApplied: () => void;
  onError: (message: string) => void;
};

function normaliseTrade(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function EstimatePackagePicker({
  projectId,
  takeoffItem,
  assemblyPackages,
  takeoffAssemblies,
  appliedAssemblyPackageId,
  onApplied,
  onError,
}: EstimatePackagePickerProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyingPackageId, setApplyingPackageId] = useState<string | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const usedPackageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const assembly of takeoffAssemblies) {
      ids.add(assembly.assembly_package_id);
    }
    return ids;
  }, [takeoffAssemblies]);

  const activePackages = useMemo(
    () => assemblyPackages.filter((pkg) => pkg.is_active),
    [assemblyPackages]
  );

  const itemTrade = normaliseTrade(takeoffItem.trade);

  const tradePackages = useMemo(() => {
    if (!itemTrade) {
      return activePackages;
    }
    return activePackages.filter(
      (pkg) => normaliseTrade(pkg.trade) === itemTrade
    );
  }, [activePackages, itemTrade]);

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();
    const pool = query ? activePackages : tradePackages;

    if (!query) {
      return pool;
    }

    return pool.filter((pkg) => {
      const haystack = [
        pkg.name,
        pkg.trade,
        pkg.description,
        pkg.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, activePackages, tradePackages]);

  const groupedByTrade = useMemo(() => {
    const groups = new Map<string, AssemblyPackage[]>();
    for (const pkg of filteredPackages) {
      const key = pkg.trade?.trim() || "General";
      const list = groups.get(key) ?? [];
      list.push(pkg);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPackages]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  function handleApply(pkg: AssemblyPackage) {
    setApplyError(null);
    setApplyingPackageId(pkg.id);

    startTransition(async () => {
      const result = await applyAssemblyPackageToTakeoffAction(projectId, {
        takeoff_item_id: takeoffItem.id,
        assembly_package_id: pkg.id,
        quantity: takeoffItem.quantity,
        unit: takeoffItem.unit?.trim() || pkg.unit || "each",
        replace_existing_pricing: true,
      });

      setApplyingPackageId(null);

      if (result.error) {
        setApplyError(result.error);
        onError(result.error);
        return;
      }

      dispatchEstimateUpdated(projectId);
      onApplied();
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <Input
        ref={searchRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search packages…"
        className="h-8 text-sm"
        aria-label="Search assembly packages"
      />

      {applyError ? (
        <p className="text-xs text-destructive" role="alert">
          {applyError}
        </p>
      ) : null}

      {groupedByTrade.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No packages match your search.
        </p>
      ) : (
        groupedByTrade.map(([tradeLabel, packages]) => (
          <div key={tradeLabel} className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {tradeLabel}
              {!search.trim() && itemTrade && tradeLabel === takeoffItem.trade
                ? " (item trade)"
                : null}
            </p>
            <ul className="space-y-2">
              {packages.map((pkg) => {
                const isUsedOnProject = usedPackageIds.has(pkg.id);
                const isCurrent = appliedAssemblyPackageId === pkg.id;
                const isApplying = applyingPackageId === pkg.id && isPending;

                return (
                  <li
                    key={pkg.id}
                    className={cn(
                      "rounded-md border border-border bg-card p-3",
                      isCurrent && "ring-1 ring-primary/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {isUsedOnProject ? "● " : null}
                          {pkg.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {pkg.trade || "—"} ·{" "}
                          {formatCurrency(pkg.default_cost_rate)} / {pkg.unit}
                        </p>
                        {pkg.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {pkg.description}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isApplying}
                        onClick={() => handleApply(pkg)}
                      >
                        {isApplying ? "Applying…" : "Apply"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
