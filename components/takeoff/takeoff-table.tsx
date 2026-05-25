"use client";

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
import { EditTakeoffItemDialog } from "@/components/takeoff/edit-takeoff-item-dialog";
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
import {
  buildDrawingReferenceContext,
  formatDrawingReferencePrimary,
  formatDrawingReferenceSecondary,
} from "@/src/lib/takeoff/drawing-reference";
import type { Document, DocumentPage, TakeoffItem } from "@/src/types/database";

type TakeoffTableProps = {
  projectId: string;
  items: TakeoffItem[];
  documents: Document[];
  documentPages: DocumentPage[];
};

export function TakeoffTable({
  projectId,
  items: initialItems,
  documents,
  documentPages,
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
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const tradesInUse = useMemo(
    () => Array.from(new Set(items.map((item) => item.trade))).sort(),
    [items]
  );

  const filteredItems = useMemo(
    () => filterTakeoffItems(items, filters),
    [items, filters]
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
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.item_name}
          </span>
        ),
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
            {formatDrawingReferenceSecondary(row.original, drawingContext) ??
              "No document linked"}
          </span>
        ),
      },
      {
        id: "drawing_reference",
        header: "Drawing Ref",
        cell: ({ row }) => (
          <span className="max-w-[160px] font-mono text-sm tabular-nums">
            {formatDrawingReferencePrimary(row.original, drawingContext)}
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
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
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
        ),
      },
    ],
    [drawingContext, isPending, pendingRowId, projectId]
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
