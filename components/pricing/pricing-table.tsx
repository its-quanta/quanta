"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";

import { BulkActionBar } from "@/components/bulk-operations/bulk-action-bar";
import { BulkValueSheet } from "@/components/bulk-operations/bulk-value-sheet";
import { InlineEditCell } from "@/components/bulk-operations/inline-edit-cell";
import { RowSelectionCheckbox } from "@/components/bulk-operations/row-selection-checkbox";
import { useRowSelection } from "@/components/bulk-operations/use-row-selection";
import { EditPricingItemDialog } from "@/components/pricing/edit-pricing-item-dialog";
import { LinkStandardsDialog } from "@/components/standards/link-standards-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkDeletePricingItemsAction,
  bulkMarkPricingTakeoffReviewedAction,
  bulkUpdatePricingMarginAction,
  bulkUpdatePricingMarkupAction,
} from "@/src/lib/bulk-operations/actions";
import {
  deletePricingItemAction,
  updatePricingItemAction,
} from "@/src/lib/pricing/actions";
import { formatPricingMethodLabel } from "@/src/lib/pricing/constants";
import {
  formatPricingSourceShort,
} from "@/src/lib/pricing/pricing-source";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  Standard,
  StandardLinkWithStandard,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

function filterLinksForPricing(
  links: StandardLinkWithStandard[],
  pricingItemId: string
): StandardLinkWithStandard[] {
  return links.filter(
    (link) =>
      link.entity_type === "pricing_item" && link.entity_id === pricingItemId
  );
}
import { formatCurrency, formatPercent } from "@/src/lib/format";

type PricingTableProps = {
  projectId: string;
  pricingItems: PricingItemWithTakeoff[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  onAddPricing: () => void;
};

function formatOptionalPercent(value: number | null): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return formatPercent(value);
}

export function PricingTable({
  projectId,
  pricingItems: initialItems,
  takeoffAssemblies,
  organisationStandards,
  projectStandardLinks,
  onAddPricing,
}: PricingTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<PricingItemWithTakeoff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PricingItemWithTakeoff | null>(
    null
  );
  const [linkStandardsTarget, setLinkStandardsTarget] =
    useState<PricingItemWithTakeoff | null>(null);
  const [bulkMarkupOpen, setBulkMarkupOpen] = useState(false);
  const [bulkMarginOpen, setBulkMarginOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const selection = useRowSelection();
  const visibleIds = useMemo(() => items.map((item) => item.id), [items]);

  const assemblyByTakeoffId = useMemo(
    () =>
      new Map(
        takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [takeoffAssemblies]
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const result = await deletePricingItemAction(deleteTarget.id, projectId);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      setDeleteTarget(null);
      setSuccessMessage("Pricing line removed.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Pricing schedule</p>
          <p className="text-xs text-muted-foreground">
            {items.length} priced line{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" onClick={onAddPricing}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Add pricing item
        </Button>
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

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No pricing lines yet. Add pricing from a takeoff item to build your
            bid totals.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={onAddPricing}
          >
            Add first pricing line
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead scope="col" className="w-10">
                  <RowSelectionCheckbox
                    checked={selection.getHeaderCheckboxState(visibleIds)}
                    ariaLabel="Select all pricing lines"
                    onChange={() => selection.selectAllVisible(visibleIds)}
                  />
                </TableHead>
                <TableHead scope="col">Takeoff item</TableHead>
                <TableHead scope="col">Method</TableHead>
                <TableHead scope="col">Pricing source</TableHead>
                <TableHead scope="col" className="text-right">
                  Qty
                </TableHead>
                <TableHead scope="col">Unit</TableHead>
                <TableHead scope="col" className="text-right">
                  Cost rate
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Total cost
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Markup %
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Margin %
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Sell rate
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Total sell
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Gross profit
                </TableHead>
                <TableHead scope="col">Notes</TableHead>
                <TableHead scope="col" className="w-[72px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const appliedAssembly = assemblyByTakeoffId.get(
                  item.takeoff_item_id
                );
                const isPackagePricing = item.pricing_method === "package";

                return (
                <TableRow
                  key={item.id}
                  className={cn(
                    selection.isSelected(item.id) && "bg-primary/5"
                  )}
                >
                  <TableCell>
                    <RowSelectionCheckbox
                      checked={selection.isSelected(item.id)}
                      ariaLabel={`Select ${item.takeoff_item.item_name}`}
                      onChange={() => undefined}
                      onClick={(event) =>
                        selection.handleRowSelect(item.id, visibleIds, event)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[140px]">
                      <p className="text-sm font-medium">
                        {item.takeoff_item.item_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.takeoff_item.trade}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {formatPricingMethodLabel(item.pricing_method)}
                      </Badge>
                      {isPackagePricing ? (
                        <Badge
                          variant="outline"
                          className="border-violet-500/30 bg-violet-500/10 text-violet-800"
                        >
                          Package
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[120px]">
                      <p className="text-sm text-foreground">
                        {formatPricingSourceShort(
                          item.pricing_method,
                          appliedAssembly
                        )}
                      </p>
                      {appliedAssembly && isPackagePricing ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {appliedAssembly.assembly_package.name}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-sm">{item.unit}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(item.cost_rate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(item.total_cost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <InlineEditCell
                      value={
                        item.markup_percentage != null
                          ? String(item.markup_percentage)
                          : ""
                      }
                      displayValue={formatOptionalPercent(item.markup_percentage)}
                      align="right"
                      type="number"
                      parse={(raw) => {
                        const parsed = Number(raw);
                        return Number.isNaN(parsed) ? null : parsed;
                      }}
                      onSave={async (value) => {
                        const result = await updatePricingItemAction(
                          item.id,
                          projectId,
                          {
                            markup_percentage: Number(value),
                            margin_percentage: null,
                          }
                        );
                        if (!result.error) {
                          router.refresh();
                        }
                        return result;
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <InlineEditCell
                      value={
                        item.margin_percentage != null
                          ? String(item.margin_percentage)
                          : ""
                      }
                      displayValue={formatOptionalPercent(item.margin_percentage)}
                      align="right"
                      type="number"
                      parse={(raw) => {
                        const parsed = Number(raw);
                        return Number.isNaN(parsed) ? null : parsed;
                      }}
                      onSave={async (value) => {
                        const result = await updatePricingItemAction(
                          item.id,
                          projectId,
                          {
                            margin_percentage: Number(value),
                            markup_percentage: null,
                          }
                        );
                        if (!result.error) {
                          router.refresh();
                        }
                        return result;
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <InlineEditCell
                      value={String(item.sell_rate)}
                      displayValue={`${formatCurrency(item.sell_rate)}${item.sell_rate_overridden ? " (override)" : ""}`}
                      align="right"
                      type="number"
                      parse={(raw) => {
                        const parsed = Number(raw);
                        return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
                      }}
                      onSave={async (value) => {
                        const result = await updatePricingItemAction(
                          item.id,
                          projectId,
                          {
                            sell_rate: Number(value),
                            sell_rate_overridden: true,
                          }
                        );
                        if (!result.error) {
                          router.refresh();
                        }
                        return result;
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(item.total_sell)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums text-emerald-700">
                    {formatCurrency(item.gross_profit)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                    {item.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditItem(item)}>
                          <HugeiconsIcon
                            icon={Edit02Icon}
                            className="size-4"
                          />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setLinkStandardsTarget(item)}
                          disabled={organisationStandards.length === 0}
                        >
                          Link standards
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-4"
                          />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clearSelection}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setBulkMarkupOpen(true)}
        >
          Apply markup
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setBulkMarginOpen(true)}
        >
          Apply margin
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const takeoffIds = items
              .filter((row) => selection.selectedIds.has(row.id))
              .map((row) => row.takeoff_item_id);
            startTransition(async () => {
              const result = await bulkMarkPricingTakeoffReviewedAction(
                projectId,
                takeoffIds
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

      <BulkValueSheet
        open={bulkMarkupOpen}
        onOpenChange={setBulkMarkupOpen}
        title="Apply markup"
        description="Set markup percentage on selected pricing lines"
        label="Markup %"
        inputType="number"
        selectedCount={selection.selectedCount}
        onApply={async (raw) => {
          const value = Number(raw);
          if (Number.isNaN(value)) {
            return { error: "Enter a valid percentage." };
          }
          return bulkUpdatePricingMarkupAction(
            projectId,
            selection.selectedIdList,
            value
          );
        }}
        onSuccess={setSuccessMessage}
        onComplete={selection.clearSelection}
      />

      <BulkValueSheet
        open={bulkMarginOpen}
        onOpenChange={setBulkMarginOpen}
        title="Apply margin"
        description="Set margin percentage on selected pricing lines"
        label="Margin %"
        inputType="number"
        selectedCount={selection.selectedCount}
        onApply={async (raw) => {
          const value = Number(raw);
          if (Number.isNaN(value)) {
            return { error: "Enter a valid percentage." };
          }
          return bulkUpdatePricingMarginAction(
            projectId,
            selection.selectedIdList,
            value
          );
        }}
        onSuccess={setSuccessMessage}
        onComplete={selection.clearSelection}
      />

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected pricing lines?</DialogTitle>
            <DialogDescription>
              Remove {selection.selectedCount} pricing line
              {selection.selectedCount === 1 ? "" : "s"}?
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
                  const result = await bulkDeletePricingItemsAction(
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

      <LinkStandardsDialog
        open={linkStandardsTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLinkStandardsTarget(null);
          }
        }}
        entityType="pricing_item"
        entityId={linkStandardsTarget?.id ?? ""}
        entityLabel={
          linkStandardsTarget
            ? `${linkStandardsTarget.takeoff_item.item_name} pricing`
            : "pricing line"
        }
        projectId={projectId}
        links={
          linkStandardsTarget
            ? filterLinksForPricing(
                projectStandardLinks,
                linkStandardsTarget.id
              )
            : []
        }
        availableStandards={organisationStandards}
      />

      <EditPricingItemDialog
        projectId={projectId}
        item={editItem}
        open={editItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
          }
        }}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setActionError(null);
        }}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pricing line?</DialogTitle>
            <DialogDescription>
              This removes pricing for{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.takeoff_item.item_name}
              </span>
              . The takeoff line may revert to needs review if no other pricing
              exists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
