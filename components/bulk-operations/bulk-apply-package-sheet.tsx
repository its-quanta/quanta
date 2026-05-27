"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { bulkApplyPackageToTakeoffAction } from "@/src/lib/bulk-operations/actions";
import { unitsAreCompatible } from "@/src/lib/bulk-operations/units";
import type { AssemblyPackage, TakeoffItem } from "@/src/types/database";

type BulkApplyPackageSheetProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: TakeoffItem[];
  assemblyPackages: AssemblyPackage[];
  onSuccess?: (message: string) => void;
  onComplete?: () => void;
};

export function BulkApplyPackageSheet({
  projectId,
  open,
  onOpenChange,
  selectedItems,
  assemblyPackages,
  onSuccess,
  onComplete,
}: BulkApplyPackageSheetProps) {
  const router = useRouter();
  const [packageId, setPackageId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPackage = useMemo(
    () => assemblyPackages.find((pkg) => pkg.id === packageId) ?? null,
    [assemblyPackages, packageId]
  );

  const preview = useMemo(() => {
    if (!selectedPackage) {
      return selectedItems.map((item) => ({
        id: item.id,
        name: item.item_name,
        compatible: true,
        note: undefined as string | undefined,
      }));
    }
    return selectedItems.map((item) => {
      const compatible = unitsAreCompatible(item.unit, selectedPackage.unit);
      return {
        id: item.id,
        name: item.item_name,
        compatible,
        note: compatible
          ? undefined
          : `Unit mismatch (${item.unit} vs ${selectedPackage.unit})`,
      };
    });
  }, [selectedItems, selectedPackage]);

  const compatibleCount = preview.filter((row) => row.compatible).length;

  function handleApply() {
    if (!packageId) {
      setErrorMessage("Select a methodology package.");
      return;
    }

    setErrorMessage(null);
    const takeoffItemIds = selectedItems
      .filter((item) =>
        selectedPackage
          ? unitsAreCompatible(item.unit, selectedPackage.unit)
          : true
      )
      .map((item) => item.id);

    if (takeoffItemIds.length === 0) {
      setErrorMessage("No compatible lines to apply.");
      return;
    }

    startTransition(async () => {
      const result = await bulkApplyPackageToTakeoffAction(projectId, {
        takeoffItemIds,
        assemblyPackageId: packageId,
        replaceExistingPricing: true,
      });

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      const message =
        result.message ??
        `${result.updatedCount ?? 0} item${(result.updatedCount ?? 0) === 1 ? "" : "s"} updated`;
      onSuccess?.(message);
      onComplete?.();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Apply methodology</SheetTitle>
          <SheetDescription>
            Apply a package to {selectedItems.length} selected takeoff line
            {selectedItems.length === 1 ? "" : "s"}. Only compatible units are
            updated.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <div className="space-y-2">
            <Label>Methodology / package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {assemblyPackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Selected items
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
              {preview.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-0.5 text-sm"
                >
                  <span className="font-medium">{row.name}</span>
                  {row.note ? (
                    <span className="text-xs text-amber-800">{row.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {selectedPackage ? (
            <p className="text-sm text-muted-foreground">
              Methodology:{" "}
              <span className="font-medium text-foreground">
                {selectedPackage.name}
              </span>
              . {compatibleCount} of {selectedItems.length} line
              {selectedItems.length === 1 ? "" : "s"} compatible.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={isPending || !packageId || compatibleCount === 0}
          >
            {isPending ? "Applying…" : "Apply"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
