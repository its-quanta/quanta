"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  Tick02Icon,
} from "@hugeicons/core-free-icons";

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
  deleteTakeoffItemAction,
  duplicateTakeoffItemAction,
  markTakeoffItemReviewedAction,
  markTakeoffItemUnreviewedAction,
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

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
        accessorKey: "trade",
        header: "Trade",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.trade}</span>
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
          <span className="block text-right font-mono text-sm tabular-nums">
            {row.original.quantity}
          </span>
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
          <span className="max-w-[140px] truncate font-mono text-sm tabular-nums">
            {row.original.drawing_reference?.trim() || "—"}
          </span>
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
          <span className="block text-right font-mono text-sm tabular-nums">
            {row.original.page_number ?? "—"}
          </span>
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
          );
        },
      },
    ],
    [
      assemblyPackages.length,
      drawingContext,
      isPending,
      onPriceManual,
      organisationStandards.length,
      pendingRowId,
      pricingByTakeoffId,
      projectId,
      takeoffAssembliesByItemId,
    ]
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manual quantity lines — review each item before pricing.
        </p>
        <Button type="button" onClick={handleAddItem} disabled={isPending}>
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
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="align-top hover:bg-muted/20">
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
}
