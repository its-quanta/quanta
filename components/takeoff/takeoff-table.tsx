"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  LinkSquare01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { useTakeoffRelationshipsOptional } from "@/components/takeoff/takeoff-relationships-context";

import { BulkActionBar } from "@/components/bulk-operations/bulk-action-bar";
import { BulkApplyPackageSheet } from "@/components/bulk-operations/bulk-apply-package-sheet";
import { BulkValueSheet } from "@/components/bulk-operations/bulk-value-sheet";
import { InlineEditCell } from "@/components/bulk-operations/inline-edit-cell";
import { RowSelectionCheckbox } from "@/components/bulk-operations/row-selection-checkbox";
import { useEstimatorShortcuts } from "@/components/bulk-operations/use-estimator-shortcuts";
import { useRowSelection } from "@/components/bulk-operations/use-row-selection";
import { AddTakeoffItemDialog } from "@/components/takeoff/add-takeoff-item-dialog";
import { LinkStandardsDialog } from "@/components/standards/link-standards-dialog";
import { ApplyPackageDialog } from "@/components/takeoff/apply-package-dialog";
import { EditTakeoffItemDialog } from "@/components/takeoff/edit-takeoff-item-dialog";
import { TakeoffSourceDialog } from "@/components/takeoff/takeoff-source-dialog";
import { TakeoffStatusBadge } from "@/components/takeoff/takeoff-status-badge";
import {
  defaultTakeoffFilters,
  filterTakeoffItems,
  TakeoffFiltersBar,
  type TakeoffFilters,
} from "@/components/takeoff/takeoff-filters-bar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import {
  bulkDeleteTakeoffItemsAction,
  bulkMarkTakeoffReviewedAction,
  bulkUpdateTakeoffTradeAction,
} from "@/src/lib/bulk-operations/actions";
import {
  deleteTakeoffItemAction,
  duplicateTakeoffItemAction,
  markTakeoffItemReviewedAction,
  markTakeoffItemUnreviewedAction,
  updateTakeoffItemAction,
} from "@/src/lib/takeoff/actions";
import { formatPricingSourceLabel } from "@/src/lib/pricing/pricing-source";
import {
  buildDrawingReferenceContext,
  formatSourceDocumentFileName,
} from "@/src/lib/takeoff/drawing-reference";
import type {
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

function filterLinksForTakeoff(
  links: StandardLinkWithStandard[],
  takeoffItemId: string
): StandardLinkWithStandard[] {
  return links.filter(
    (link) =>
      link.entity_type === "takeoff_item" && link.entity_id === takeoffItemId
  );
}

type TakeoffTableProps = {
  projectId: string;
  items: TakeoffItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  assemblyPackages: AssemblyPackage[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  onPriceManual?: (takeoffItemId: string) => void;
  showWorkflowFilter?: boolean;
  virtualized?: boolean;
};

export function TakeoffTable({
  projectId,
  items: initialItems,
  documents,
  documentPages,
  assemblyPackages,
  takeoffAssemblies,
  pricingItems,
  organisationStandards,
  projectStandardLinks,
  onPriceManual,
  showWorkflowFilter = false,
  virtualized = false,
}: TakeoffTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<TakeoffFilters>(defaultTakeoffFilters);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TakeoffItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TakeoffItem | null>(null);
  const [applyPackageItem, setApplyPackageItem] = useState<TakeoffItem | null>(
    null
  );
  const [linkStandardsItem, setLinkStandardsItem] = useState<TakeoffItem | null>(
    null
  );
  const [sourceItem, setSourceItem] = useState<TakeoffItem | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [bulkPackageOpen, setBulkPackageOpen] = useState(false);
  const [bulkTradeOpen, setBulkTradeOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const selection = useRowSelection();
  const takeoffRelationships = useTakeoffRelationshipsOptional();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    function onBulkApplyPackage() {
      if (selection.selectedCount > 0) {
        setBulkPackageOpen(true);
      }
    }
    window.addEventListener("quanta:bulk-apply-package", onBulkApplyPackage);
    return () =>
      window.removeEventListener("quanta:bulk-apply-package", onBulkApplyPackage);
  }, [selection.selectedCount]);

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const takeoffAssembliesByItemId = useMemo(
    () =>
      new Map(
        takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [takeoffAssemblies]
  );

  const pricingByTakeoffId = useMemo(
    () =>
      new Map(
        pricingItems.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [pricingItems]
  );

  const tradesInUse = useMemo(
    () => Array.from(new Set(items.map((item) => item.trade))).sort(),
    [items]
  );

  const workflowContext = useMemo(
    () => ({
      takeoffAssemblies,
      pricingItems,
      standardLinks: projectStandardLinks,
    }),
    [takeoffAssemblies, pricingItems, projectStandardLinks]
  );

  const filteredItems = useMemo(
    () => filterTakeoffItems(items, filters, workflowContext),
    [items, filters, workflowContext]
  );

  const visibleIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems]
  );

  const selectedTakeoffItems = useMemo(
    () => items.filter((item) => selection.selectedIds.has(item.id)),
    [items, selection.selectedIds]
  );

  useEstimatorShortcuts({
    enabled: filteredItems.length > 0,
    onSearch: () => {
      document.getElementById("takeoff-search")?.focus();
    },
    onEditSelected: () => {
      const first = selectedTakeoffItems[0];
      if (first) {
        setEditItem(first);
      }
    },
    onApplyPackage: () => {
      if (selection.selectedCount > 0) {
        setBulkPackageOpen(true);
      }
    },
    onMarkReviewed: () => {
      if (selection.selectedCount === 0) {
        return;
      }
      startTransition(async () => {
        const result = await bulkMarkTakeoffReviewedAction(
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
    },
    onDeleteSelected: () => {
      if (selection.selectedCount > 0) {
        setBulkDeleteOpen(true);
      }
    },
    onEscape: () => {
      setBulkPackageOpen(false);
      setBulkTradeOpen(false);
      setBulkDeleteOpen(false);
      setEditItem(null);
      setDeleteTarget(null);
    },
  });

  function runRowAction(
    itemId: string,
    action: () => Promise<{ error?: string }>
  ) {
    setActionError(null);
    setPendingRowId(itemId);

    startTransition(async () => {
      const result = await action();
      setPendingRowId(null);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<TakeoffItem>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <RowSelectionCheckbox
            checked={selection.getHeaderCheckboxState(visibleIds)}
            ariaLabel="Select all visible takeoff lines"
            onChange={() => selection.selectAllVisible(visibleIds)}
          />
        ),
        cell: ({ row }) => (
          <RowSelectionCheckbox
            checked={selection.isSelected(row.original.id)}
            ariaLabel={`Select ${row.original.item_name}`}
            onChange={() => undefined}
            onClick={(event) =>
              selection.handleRowSelect(row.original.id, visibleIds, event)
            }
          />
        ),
      },
      {
        accessorKey: "trade",
        header: "Trade",
        cell: ({ row }) => (
          <InlineEditCell
            value={row.original.trade}
            onSave={async (value) =>
              updateTakeoffItemAction(row.original.id, projectId, {
                trade: String(value),
              })
            }
          />
        ),
      },
      {
        accessorKey: "item_name",
        header: "Item",
        cell: ({ row }) => {
          const applied = takeoffAssembliesByItemId.get(row.original.id);

          return (
            <div className="flex min-w-[140px] flex-col gap-1">
              <span className="font-medium text-foreground">
                {row.original.item_name}
              </span>
              {applied ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-violet-500/30 bg-violet-500/10 text-violet-800"
                  >
                    Package applied
                  </Badge>
                  <Link
                    href={`/templates/${applied.assembly_package_id}`}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    {applied.assembly_package.name}
                  </Link>
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate text-sm text-muted-foreground">
            {row.original.description ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: () => <span className="block text-right">Quantity</span>,
        cell: ({ row }) => (
          <InlineEditCell
            value={String(row.original.quantity)}
            align="right"
            type="number"
            parse={(raw) => {
              const parsed = Number(raw);
              if (Number.isNaN(parsed) || parsed < 0) {
                return null;
              }
              return parsed;
            }}
            onSave={async (value) => {
              const result = await updateTakeoffItemAction(
                row.original.id,
                projectId,
                { quantity: Number(value) }
              );
              if (!result.error) {
                router.refresh();
              }
              return result;
            }}
          />
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.unit}
          </span>
        ),
      },
      {
        id: "document",
        header: "Document",
        cell: ({ row }) => (
          <span
            className={cn(
              "max-w-[160px] truncate text-sm",
              !row.original.source_document_id && "text-muted-foreground"
            )}
          >
            {formatSourceDocumentFileName(row.original, drawingContext)}
          </span>
        ),
      },
      {
        id: "drawing_reference",
        header: "Drawing ref",
        cell: ({ row }) => (
          <InlineEditCell
            value={row.original.drawing_reference?.trim() ?? ""}
            displayValue={row.original.drawing_reference?.trim() || "—"}
            className="max-w-[140px]"
            onSave={async (value) => {
              const result = await updateTakeoffItemAction(
                row.original.id,
                projectId,
                { drawing_reference: String(value).trim() || null }
              );
              if (!result.error) {
                router.refresh();
              }
              return result;
            }}
          />
        ),
      },
      {
        accessorKey: "sheet_number",
        header: "Sheet",
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.sheet_number ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "page_number",
        header: () => <span className="block text-right">Page</span>,
        cell: ({ row }) => (
          <InlineEditCell
            value={
              row.original.page_number != null
                ? String(row.original.page_number)
                : ""
            }
            displayValue={
              row.original.page_number != null
                ? String(row.original.page_number)
                : "—"
            }
            align="right"
            type="number"
            parse={(raw) => {
              if (!raw.trim()) {
                return null;
              }
              const parsed = Number(raw);
              if (Number.isNaN(parsed) || parsed <= 0) {
                return null;
              }
              return parsed;
            }}
            onSave={async (value) => {
              const result = await updateTakeoffItemAction(
                row.original.id,
                projectId,
                {
                  page_number:
                    value === null || value === "" ? null : Number(value),
                }
              );
              if (!result.error) {
                router.refresh();
              }
              return result;
            }}
          />
        ),
      },
      {
        accessorKey: "specification_reference",
        header: "Spec ref",
        cell: ({ row }) => (
          <span className="max-w-[120px] truncate font-mono text-sm tabular-nums">
            {row.original.specification_reference?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "pricing",
        header: "Pricing",
        cell: ({ row }) => {
          const pricing = pricingByTakeoffId.get(row.original.id);
          if (!pricing) {
            return (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-800"
              >
                Unpriced
              </Badge>
            );
          }
          return (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
            >
              Priced
            </Badge>
          );
        },
      },
      {
        id: "pricing_source",
        header: "Pricing",
        cell: ({ row }) => {
          const pricing = pricingByTakeoffId.get(row.original.id);
          const applied = takeoffAssembliesByItemId.get(row.original.id);
          return (
            <span className="text-sm text-muted-foreground">
              {formatPricingSourceLabel(pricing?.pricing_method, applied)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <TakeoffStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "reviewed",
        header: "Reviewed",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              row.original.reviewed
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/30 bg-amber-500/10 text-amber-800"
            )}
          >
            {row.original.reviewed ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="max-w-[140px] truncate text-sm text-muted-foreground">
            {row.original.notes ?? "—"}
          </span>
        ),
      },
      {
        id: "open_source",
        header: () => <span className="sr-only">Source</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setSourceItem(row.original)}
          >
            Open source
          </Button>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const hasPackage = takeoffAssembliesByItemId.has(row.original.id);

          return (
          <div className="flex items-center justify-end gap-1">
            {takeoffRelationships ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Open relationships"
                aria-label={`Open relationships for ${row.original.item_name}`}
                onClick={() =>
                  takeoffRelationships.openRelationships(row.original)
                }
              >
                <HugeiconsIcon icon={LinkSquare01Icon} strokeWidth={2} />
              </Button>
            ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending && pendingRowId === row.original.id}
              >
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditItem(row.original)}>
                <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                Edit
              </DropdownMenuItem>
              {takeoffRelationships ? (
                <DropdownMenuItem
                  onClick={() =>
                    takeoffRelationships.openRelationships(row.original)
                  }
                >
                  <HugeiconsIcon icon={LinkSquare01Icon} strokeWidth={2} />
                  Open relationships
                </DropdownMenuItem>
              ) : null}
              {row.original.status !== "excluded" ? (
                <DropdownMenuItem
                  onClick={() => setApplyPackageItem(row.original)}
                  disabled={assemblyPackages.length === 0}
                >
                  {hasPackage ? "Replace package" : "Apply package"}
                </DropdownMenuItem>
              ) : null}
              {row.original.status !== "excluded" && onPriceManual ? (
                <DropdownMenuItem
                  onClick={() => onPriceManual(row.original.id)}
                >
                  Price manual
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => setLinkStandardsItem(row.original)}
                disabled={organisationStandards.length === 0}
              >
                Link standards
              </DropdownMenuItem>
              {row.original.reviewed ? (
                <DropdownMenuItem
                  onClick={() => runRowAction(row.original.id, () =>
                    markTakeoffItemUnreviewedAction(row.original.id, projectId)
                  )}
                >
                  Mark unreviewed
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => runRowAction(row.original.id, () =>
                    markTakeoffItemReviewedAction(row.original.id, projectId)
                  )}
                >
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                  Mark reviewed
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => runRowAction(row.original.id, () =>
                  duplicateTakeoffItemAction(row.original.id, projectId)
                )}
              >
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
          );
        },
      },
    ],
    [
      assemblyPackages.length,
      takeoffRelationships,
      drawingContext,
      isPending,
      onPriceManual,
      organisationStandards.length,
      pendingRowId,
      pricingByTakeoffId,
      projectId,
      router,
      selection,
      takeoffAssembliesByItemId,
      visibleIds,
    ]
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 76,
    overscan: 12,
  });

  function handleAddItem() {
    setActionError(null);
    setSuccessMessage(null);
    setAddDialogOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const targetId = deleteTarget.id;
    setActionError(null);
    setPendingRowId(targetId);

    startTransition(async () => {
      const result = await deleteTakeoffItemAction(targetId, projectId);
      setPendingRowId(null);
      setDeleteTarget(null);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const hasAnyItems = items.length > 0;
  const showFilteredEmpty = hasAnyItems && filteredItems.length === 0;
  const virtualItems = rowVirtualizer.getVirtualItems();
  const virtualPaddingTop =
    virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const virtualPaddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end
      : 0;

  const body = (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p
          className={
            virtualized
              ? "text-base text-muted-foreground"
              : "text-sm text-muted-foreground"
          }
        >
          Manual quantity lines — review each item before pricing.
        </p>
        <Button
          type="button"
          size={virtualized ? "default" : "default"}
          className={virtualized ? "h-10" : undefined}
          onClick={handleAddItem}
          disabled={isPending}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add item
        </Button>
      </div>

      {hasAnyItems ? (
        <TakeoffFiltersBar
          filters={filters}
          onChange={setFilters}
          documents={documents}
          tradesInUse={tradesInUse}
          showWorkflowFilter={showWorkflowFilter}
        />
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      {!hasAnyItems ? (
        <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Start building your takeoff by adding scope items from your drawings
            or tender documents.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={handleAddItem}
            disabled={isPending}
          >
            Add Takeoff Item
          </Button>
        </div>
      ) : showFilteredEmpty ? (
        <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No takeoff lines match your filters.
          </p>
        </div>
      ) : virtualized ? (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-auto rounded-lg ring-1 ring-border"
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-muted/80">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      scope="col"
                      className={cn(
                        "text-sm",
                        header.column.id === "quantity" ||
                          header.column.id === "page_number"
                          ? "text-right"
                          : undefined
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {virtualPaddingTop > 0 ? (
                <TableRow aria-hidden>
                  <TableCell
                    colSpan={columnCount}
                    className="border-0 p-0"
                    style={{ height: virtualPaddingTop }}
                  />
                </TableRow>
              ) : null}
              {virtualItems.map((virtualRow) => {
                const row = tableRows[virtualRow.index];
                if (!row) {
                  return null;
                }
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "align-top hover:bg-muted/20",
                      selection.isSelected(row.original.id) && "bg-primary/5"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5 text-sm">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {virtualPaddingBottom > 0 ? (
                <TableRow aria-hidden>
                  <TableCell
                    colSpan={columnCount}
                    className="border-0 p-0"
                    style={{ height: virtualPaddingBottom }}
                  />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-muted/80">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      scope="col"
                      className={cn(
                        header.column.id === "quantity" ||
                          header.column.id === "page_number"
                          ? "text-right"
                          : undefined
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "align-top hover:bg-muted/20",
                    selection.isSelected(row.original.id) && "bg-primary/5"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddTakeoffItemDialog
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={setSuccessMessage}
      />

      <LinkStandardsDialog
        open={Boolean(linkStandardsItem)}
        onOpenChange={(open) => {
          if (!open) {
            setLinkStandardsItem(null);
          }
        }}
        entityType="takeoff_item"
        entityId={linkStandardsItem?.id ?? ""}
        entityLabel={linkStandardsItem?.item_name ?? "takeoff line"}
        projectId={projectId}
        links={
          linkStandardsItem
            ? filterLinksForTakeoff(projectStandardLinks, linkStandardsItem.id)
            : []
        }
        availableStandards={organisationStandards}
      />

      <ApplyPackageDialog
        projectId={projectId}
        takeoffItem={applyPackageItem}
        existingAssembly={
          applyPackageItem
            ? (takeoffAssembliesByItemId.get(applyPackageItem.id) ?? null)
            : null
        }
        assemblyPackages={assemblyPackages}
        existingPricing={
          applyPackageItem
            ? (pricingByTakeoffId.get(applyPackageItem.id) ?? null)
            : null
        }
        open={Boolean(applyPackageItem)}
        onOpenChange={(open) => {
          if (!open) {
            setApplyPackageItem(null);
          }
        }}
        onSuccess={setSuccessMessage}
      />

      <EditTakeoffItemDialog
        projectId={projectId}
        item={editItem}
        documents={documents}
        documentPages={documentPages}
        open={Boolean(editItem)}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
          }
        }}
        onSuccess={setSuccessMessage}
      />

      <TakeoffSourceDialog
        item={sourceItem}
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
        assembly={
          sourceItem
            ? (takeoffAssembliesByItemId.get(sourceItem.id) ?? null)
            : null
        }
        open={Boolean(sourceItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSourceItem(null);
          }
        }}
      />

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clearSelection}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={assemblyPackages.length === 0 || isPending}
          onClick={() => setBulkPackageOpen(true)}
        >
          Apply methodology
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => setBulkTradeOpen(true)}
        >
          Assign trade
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await bulkMarkTakeoffReviewedAction(
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
          variant="secondary"
          disabled={organisationStandards.length === 0 || isPending}
          onClick={() => {
            const first = selectedTakeoffItems[0];
            if (first) {
              setLinkStandardsItem(first);
            }
          }}
        >
          Link standard
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            const first = selectedTakeoffItems[0];
            if (first) {
              setSourceItem(first);
            }
          }}
        >
          Assign source
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => setBulkDeleteOpen(true)}
        >
          Delete
        </Button>
      </BulkActionBar>

      <BulkApplyPackageSheet
        projectId={projectId}
        open={bulkPackageOpen}
        onOpenChange={setBulkPackageOpen}
        selectedItems={selectedTakeoffItems}
        assemblyPackages={assemblyPackages}
        onSuccess={setSuccessMessage}
        onComplete={selection.clearSelection}
      />

      <BulkValueSheet
        open={bulkTradeOpen}
        onOpenChange={setBulkTradeOpen}
        title="Assign trade"
        description="Apply the same trade to selected takeoff lines"
        label="Trade"
        placeholder="e.g. Carpentry"
        selectedCount={selection.selectedCount}
        onApply={async (trade) =>
          bulkUpdateTakeoffTradeAction(projectId, selection.selectedIdList, trade)
        }
        onSuccess={setSuccessMessage}
        onComplete={selection.clearSelection}
      />

      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected takeoff lines?</DialogTitle>
            <DialogDescription>
              Remove {selection.selectedCount} line
              {selection.selectedCount === 1 ? "" : "s"}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await bulkDeleteTakeoffItemsAction(
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
              {isPending ? "Deleting…" : "Delete selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete takeoff item</DialogTitle>
            <DialogDescription>
              Remove{" "}
              {deleteTarget?.item_name?.trim() || "this line"} from the takeoff?
              This cannot be undone.
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
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (virtualized) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">{body}</div>
    );
  }

  return body;
}
