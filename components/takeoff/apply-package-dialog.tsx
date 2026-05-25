"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyAssemblyPackageToTakeoffAction,
  removeAssemblyPackageFromTakeoffAction,
} from "@/src/lib/takeoff-assembly/actions";
import { computeAverageMarginPercent } from "@/src/lib/pricing/calculations";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import { formatPricingMethodLabel } from "@/src/lib/pricing/constants";
import type {
  AssemblyPackage,
  PricingItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ApplyPackageDialogProps = {
  projectId: string;
  takeoffItem: TakeoffItem | null;
  existingAssembly: TakeoffItemAssemblyWithPackage | null;
  assemblyPackages: AssemblyPackage[];
  existingPricing: PricingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
};

function parseQuantity(value: string): number | null {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function ApplyPackageDialog({
  projectId,
  takeoffItem,
  existingAssembly,
  assemblyPackages,
  existingPricing,
  open,
  onOpenChange,
  onSuccess,
}: ApplyPackageDialogProps) {
  const router = useRouter();
  const [assemblyPackageId, setAssemblyPackageId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("each");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedPackage = useMemo(
    () =>
      assemblyPackages.find((pkg) => pkg.id === assemblyPackageId) ?? null,
    [assemblyPackageId, assemblyPackages]
  );

  const parsedQuantity = parseQuantity(quantity);
  const costRate = selectedPackage?.default_cost_rate ?? 0;
  const sellRate = selectedPackage?.default_sell_rate ?? 0;
  const totalCost =
    parsedQuantity !== null ? parsedQuantity * costRate : null;
  const totalSell =
    parsedQuantity !== null ? parsedQuantity * sellRate : null;
  const grossProfit =
    totalCost !== null && totalSell !== null ? totalSell - totalCost : null;
  const marginPercent =
    totalSell !== null && grossProfit !== null
      ? computeAverageMarginPercent(totalSell, grossProfit)
      : null;

  const needsReplace =
    existingPricing !== null &&
    existingPricing.pricing_method !== "package" &&
    !replaceConfirmed;

  const isReplacingPackage =
    existingAssembly !== null ||
    (existingPricing !== null && existingPricing.pricing_method === "package");

  useEffect(() => {
    if (!open || !takeoffItem) {
      return;
    }

    const initialPackageId =
      existingAssembly?.assembly_package_id ?? "";
    setAssemblyPackageId(initialPackageId);
    setQuantity(
      existingAssembly
        ? String(existingAssembly.quantity)
        : String(takeoffItem.quantity)
    );
    setUnit(existingAssembly?.unit ?? takeoffItem.unit);
    setErrorMessage(null);
    setReplaceConfirmed(false);
  }, [open, takeoffItem, existingAssembly]);

  function handlePackageChange(value: string) {
    setAssemblyPackageId(value);
    const pkg = assemblyPackages.find((item) => item.id === value);
    if (pkg) {
      setUnit(pkg.unit);
    }
  }

  function submit(replaceExistingPricing: boolean) {
    if (!takeoffItem) {
      return;
    }

    if (!assemblyPackageId) {
      setErrorMessage("Select an assembly package.");
      return;
    }

    if (parsedQuantity === null) {
      setErrorMessage("Enter a valid quantity.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await applyAssemblyPackageToTakeoffAction(projectId, {
        takeoff_item_id: takeoffItem.id,
        assembly_package_id: assemblyPackageId,
        quantity: parsedQuantity,
        unit: unit.trim() || "each",
        replace_existing_pricing: replaceExistingPricing,
      });

      if (result.needsReplace && result.existingPricingMethod) {
        setReplaceConfirmed(true);
        setErrorMessage(
          `This takeoff item already has ${formatPricingMethodLabel(result.existingPricingMethod)} pricing. Applying a package will replace the existing pricing.`
        );
        return;
      }

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      onOpenChange(false);
      const materialPart =
        result.materialCount != null && result.materialCount > 0
          ? `${result.materialCount} material line${result.materialCount === 1 ? "" : "s"}`
          : null;
      const labourPart =
        result.labourCount != null && result.labourCount > 0
          ? `${result.labourCount} labour line${result.labourCount === 1 ? "" : "s"}`
          : null;
      const generatedParts = [materialPart, labourPart].filter(Boolean);
      const generatedSuffix =
        generatedParts.length > 0
          ? ` Generated ${generatedParts.join(" and ")}.`
          : "";

      onSuccess?.(
        (isReplacingPackage
          ? "Package replaced and pricing updated."
          : "Package applied and pricing updated.") + generatedSuffix
      );
      router.refresh();
    });
  }

  function handleRemovePackage() {
    if (!takeoffItem || !existingAssembly) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await removeAssemblyPackageFromTakeoffAction(
        projectId,
        takeoffItem.id
      );

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.("Package removed. Materials and labour lines cleared.");
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (needsReplace) {
      setErrorMessage(
        "This takeoff item already has pricing. Confirm replace below, or cancel."
      );
      return;
    }

    submit(replaceConfirmed || !needsReplace);
  }

  const takeoffLabel = takeoffItem
    ? `${takeoffItem.item_name} · ${takeoffItem.trade}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply Assembly Package</DialogTitle>
          <DialogDescription>
            Apply a reusable assembly package to this takeoff line. Pricing,
            materials, and labour are generated automatically from package
            components.
          </DialogDescription>
        </DialogHeader>

        {!takeoffItem ? null : assemblyPackages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active assembly packages yet. Create a package in Templates
            first.
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Takeoff item</Label>
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {takeoffLabel}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apply-package-select">Assembly / package</Label>
              <Select
                value={assemblyPackageId}
                onValueChange={handlePackageChange}
                disabled={isPending}
              >
                <SelectTrigger id="apply-package-select" className="w-full">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {assemblyPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                      {pkg.trade ? ` · ${pkg.trade}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="apply-package-quantity">Quantity</Label>
                <Input
                  id="apply-package-quantity"
                  type="number"
                  min={0}
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-package-unit">Unit</Label>
                <Input
                  id="apply-package-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Package trade</Label>
                <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  {selectedPackage?.trade?.trim() || "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Package unit</Label>
                <p className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm tabular-nums">
                  {selectedPackage?.unit ?? "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Cost rate per unit</p>
                <p className="font-mono text-sm tabular-nums">
                  {formatCurrency(costRate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sell rate per unit</p>
                <p className="font-mono text-sm tabular-nums">
                  {formatCurrency(sellRate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total cost</p>
                <p className="font-mono text-sm tabular-nums">
                  {totalCost !== null ? formatCurrency(totalCost) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total sell</p>
                <p className="font-mono text-sm tabular-nums">
                  {totalSell !== null ? formatCurrency(totalSell) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross profit</p>
                <p className="font-mono text-sm tabular-nums text-emerald-700">
                  {grossProfit !== null ? formatCurrency(grossProfit) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin %</p>
                <p className="font-mono text-sm tabular-nums text-emerald-700">
                  {marginPercent !== null ? formatPercent(marginPercent) : "—"}
                </p>
              </div>
            </div>

            {isReplacingPackage ? (
              <p className="text-sm text-muted-foreground">
                {existingAssembly
                  ? `Replacing package “${existingAssembly.assembly_package.name}”.`
                  : "This line already has package pricing. Applying again replaces it."}
              </p>
            ) : null}

            {needsReplace ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  This takeoff item already has pricing. Applying a package will
                  replace the existing pricing.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => submit(true)}
                    disabled={isPending}
                  >
                    Replace pricing
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {errorMessage && !needsReplace ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              {existingAssembly ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemovePackage}
                  disabled={isPending}
                >
                  Remove package
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !assemblyPackageId || needsReplace}
                >
                  {isPending
                    ? "Applying…"
                    : isReplacingPackage
                      ? "Replace package"
                      : "Apply package"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
