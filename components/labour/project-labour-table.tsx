"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { BulkActionBar } from "@/components/bulk-operations/bulk-action-bar";
import { InlineEditCell } from "@/components/bulk-operations/inline-edit-cell";
import { RowSelectionCheckbox } from "@/components/bulk-operations/row-selection-checkbox";
import { useRowSelection } from "@/components/bulk-operations/use-row-selection";
import { EstimateReviewBadge } from "@/components/estimate/estimate-review-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkDeleteLabourItemsAction,
  bulkReviewLabourItemsAction,
  bulkUpdateLabourChargeRateAction,
} from "@/src/lib/bulk-operations/actions";
import { reviewProjectLabourItemAction } from "@/src/lib/estimate-generation/actions";
import { formatCurrency, formatQuantity } from "@/src/lib/format";
import type { ProjectLabourItem } from "@/src/types/database";

const ALL_FILTER = "__all__";

type ProjectLabourTableProps = {
  projectId: string;
  items: ProjectLabourItem[];
};

export function ProjectLabourTable({
  projectId,
  items: initialItems,
}: ProjectLabourTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [packageFilter, setPackageFilter] = useState(ALL_FILTER);
  const [reviewFilter, setReviewFilter] = useState(ALL_FILTER);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selection = useRowSelection();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const packageOptions = useMemo(() => {
    const names = new Set(items.map((item) => item.source_package_name));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        packageFilter !== ALL_FILTER &&
        item.source_package_name !== packageFilter
      ) {
        return false;
      }
      if (reviewFilter === "outstanding" && item.reviewed) {
        return false;
      }
      if (reviewFilter === "reviewed" && !item.reviewed) {
        return false;
      }
      return true;
    });
  }, [items, packageFilter, reviewFilter]);

  const visibleIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems]
  );

  function handleReview(itemId: string) {
    startTransition(async () => {
      const result = await reviewProjectLabourItemAction(itemId, projectId);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      setActionError(null);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No labour generated yet. Apply an assembly package with labour
          components to a takeoff item.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="labour-package-filter">Package</Label>
          <Select value={packageFilter} onValueChange={setPackageFilter}>
            <SelectTrigger
              id="labour-package-filter"
              className="w-full min-w-[12rem]"
            >
              <SelectValue placeholder="All packages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All packages</SelectItem>
              {packageOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="labour-review-filter">Review</Label>
          <Select value={reviewFilter} onValueChange={setReviewFilter}>
            <SelectTrigger
              id="labour-review-filter"
              className="w-full min-w-[12rem]"
            >
              <SelectValue placeholder="All lines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All lines</SelectItem>
              <SelectItem value="outstanding">Outstanding review</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {successMessage ? (
        <p className="text-sm text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow>
              <TableHead scope="col" className="w-10">
                <RowSelectionCheckbox
                  checked={selection.getHeaderCheckboxState(visibleIds)}
                  ariaLabel="Select all labour lines"
                  onChange={() => selection.selectAllVisible(visibleIds)}
                />
              </TableHead>
              <TableHead scope="col">Labour role</TableHead>
              <TableHead scope="col">Hours</TableHead>
              <TableHead scope="col">Unit</TableHead>
              <TableHead scope="col">Cost rate</TableHead>
              <TableHead scope="col">Charge rate</TableHead>
              <TableHead scope="col">Total cost</TableHead>
              <TableHead scope="col">Total sell</TableHead>
              <TableHead scope="col">Package source</TableHead>
              <TableHead scope="col">Reviewed</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No labour lines match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    selection.isSelected(item.id) && "bg-primary/5"
                  )}
                >
                  <TableCell>
                    <RowSelectionCheckbox
                      checked={selection.isSelected(item.id)}
                      ariaLabel={`Select ${item.labour_name}`}
                      onChange={() => undefined}
                      onClick={(event) =>
                        selection.handleRowSelect(item.id, visibleIds, event)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.labour_name}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatQuantity(item.hours)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.unit}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatCurrency(item.cost_rate)}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    <InlineEditCell
                      value={String(item.charge_rate)}
                      displayValue={formatCurrency(item.charge_rate)}
                      align="right"
                      type="number"
                      parse={(raw) => {
                        const parsed = Number(raw);
                        return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
                      }}
                      onSave={async (value) => {
                        const result = await bulkUpdateLabourChargeRateAction(
                          projectId,
                          [item.id],
                          Number(value)
                        );
                        if (!result.error) {
                          router.refresh();
                        }
                        return result;
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatCurrency(item.total_cost)}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatCurrency(item.total_sell)}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                    {item.source_package_name}
                  </TableCell>
                  <TableCell>
                    <EstimateReviewBadge reviewed={item.reviewed} />
                  </TableCell>
                  <TableCell className="text-right">
                    {!item.reviewed ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReview(item.id)}
                      >
                        <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                        Review
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clearSelection}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            startTransition(async () => {
              const result = await bulkReviewLabourItemsAction(
                projectId,
                selection.selectedIdList
              );
              if (result.error) {
                setActionError(result.error);
                return;
              }
              setSuccessMessage(result.message ?? "Marked reviewed.");
              selection.clearSelection();
              router.refresh();
            });
          }}
        >
          Mark reviewed
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => setBulkDeleteOpen(true)}
        >
          Delete
        </Button>
      </BulkActionBar>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected labour lines?</DialogTitle>
            <DialogDescription>
              Remove {selection.selectedCount} line
              {selection.selectedCount === 1 ? "" : "s"} from this estimate?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await bulkDeleteLabourItemsAction(
                    projectId,
                    selection.selectedIdList
                  );
                  setBulkDeleteOpen(false);
                  if (result.error) {
                    setActionError(result.error);
                    return;
                  }
                  setSuccessMessage(result.message ?? "Deleted.");
                  selection.clearSelection();
                  router.refresh();
                });
              }}
            >
              Delete selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
