"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
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
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { AddTakeoffItemDialog } from "@/components/takeoff/add-takeoff-item-dialog";
import { TakeoffStatusBadge } from "@/components/takeoff/takeoff-status-badge";
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
  cellInputClassName,
  cellNumberClassName,
  isTakeoffUnit,
  selectClassName,
  TAKEOFF_STATUSES,
  TAKEOFF_TRADES,
  TAKEOFF_UNITS,
} from "@/src/lib/takeoff/constants";
import {
  deleteTakeoffItemAction,
  duplicateTakeoffItemAction,
  markTakeoffItemReviewedAction,
  updateTakeoffItemAction,
} from "@/src/lib/takeoff/actions";
import type { Document, TakeoffItem, TakeoffItemUpdate } from "@/src/types/database";

type TakeoffTableProps = {
  projectId: string;
  items: TakeoffItem[];
  documents: Document[];
};

function unitSelectValue(unit: string): string {
  return isTakeoffUnit(unit) ? unit : "custom";
}

export function TakeoffTable({
  projectId,
  items: initialItems,
  documents,
}: TakeoffTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TakeoffItem | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [customUnits, setCustomUnits] = useState<Record<string, string>>({});

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const persistUpdate = useCallback(
    (itemId: string, updates: TakeoffItemUpdate) => {
      setActionError(null);
      setPendingRowId(itemId);

      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );

      startTransition(async () => {
        const result = await updateTakeoffItemAction(itemId, projectId, updates);

        setPendingRowId(null);

        if (result.error) {
          setActionError(result.error);
          router.refresh();
          return;
        }

        router.refresh();
      });
    },
    [projectId, router]
  );

  const columns = useMemo<ColumnDef<TakeoffItem>[]>(
    () => [
      {
        accessorKey: "trade",
        header: "Trade",
        cell: ({ row }) => (
          <input
            list="takeoff-trades"
            className={cellInputClassName}
            defaultValue={row.original.trade}
            disabled={isPending && pendingRowId === row.original.id}
            onBlur={(event) => {
              const value = event.target.value.trim() || "General";
              if (value !== row.original.trade) {
                persistUpdate(row.original.id, { trade: value });
              }
            }}
          />
        ),
      },
      {
        accessorKey: "item_name",
        header: "Item",
        cell: ({ row }) => (
          <input
            className={cellInputClassName}
            defaultValue={row.original.item_name}
            placeholder="Line item"
            disabled={isPending && pendingRowId === row.original.id}
            onBlur={(event) => {
              if (event.target.value !== row.original.item_name) {
                persistUpdate(row.original.id, {
                  item_name: event.target.value,
                });
              }
            }}
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <input
            className={cellInputClassName}
            defaultValue={row.original.description ?? ""}
            placeholder="Scope detail"
            disabled={isPending && pendingRowId === row.original.id}
            onBlur={(event) => {
              const value = event.target.value.trim() || null;
              if (value !== (row.original.description ?? "")) {
                persistUpdate(row.original.id, { description: value });
              }
            }}
          />
        ),
      },
      {
        accessorKey: "quantity",
        header: () => <span className="block text-right">Quantity</span>,
        cell: ({ row }) => (
          <input
            type="number"
            min={0}
            step="any"
            className={cellNumberClassName}
            defaultValue={row.original.quantity}
            disabled={isPending && pendingRowId === row.original.id}
            onBlur={(event) => {
              const value = Number(event.target.value);
              if (Number.isNaN(value)) {
                return;
              }

              if (value !== row.original.quantity) {
                persistUpdate(row.original.id, { quantity: value });
              }
            }}
          />
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => {
          const selectValue = unitSelectValue(row.original.unit);
          const customValue =
            customUnits[row.original.id] ??
            (selectValue === "custom" ? row.original.unit : "");

          return (
            <div className="flex min-w-[88px] flex-col gap-1">
              <select
                className={selectClassName}
                value={selectValue}
                disabled={isPending && pendingRowId === row.original.id}
                onChange={(event) => {
                  const next = event.target.value;

                  if (next === "custom") {
                    setCustomUnits((current) => ({
                      ...current,
                      [row.original.id]: customValue,
                    }));
                    return;
                  }

                  persistUpdate(row.original.id, { unit: next });
                }}
              >
                {TAKEOFF_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {selectValue === "custom" ? (
                <input
                  className={cellInputClassName}
                  value={customValue}
                  placeholder="Custom unit"
                  disabled={isPending && pendingRowId === row.original.id}
                  onChange={(event) => {
                    setCustomUnits((current) => ({
                      ...current,
                      [row.original.id]: event.target.value,
                    }));
                  }}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value && value !== row.original.unit) {
                      persistUpdate(row.original.id, { unit: value });
                    }
                  }}
                />
              ) : null}
            </div>
          );
        },
      },
      {
        id: "drawing",
        header: "Drawing Ref",
        cell: ({ row }) => (
          <div className="flex min-w-[140px] flex-col gap-1">
            <select
              className={selectClassName}
              value={row.original.source_document_id ?? ""}
              disabled={isPending && pendingRowId === row.original.id}
              onChange={(event) => {
                persistUpdate(row.original.id, {
                  source_document_id: event.target.value || null,
                });
              }}
            >
              <option value="">No linked document</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.file_name}
                </option>
              ))}
            </select>
            <input
              className={cellInputClassName}
              defaultValue={row.original.drawing_reference ?? ""}
              placeholder="A-302"
              disabled={isPending && pendingRowId === row.original.id}
              onBlur={(event) => {
                const value = event.target.value.trim() || null;
                if (value !== (row.original.drawing_reference ?? "")) {
                  persistUpdate(row.original.id, {
                    drawing_reference: value,
                  });
                }
              }}
            />
          </div>
        ),
      },
      {
        accessorKey: "page_number",
        header: () => <span className="block text-right">Page</span>,
        cell: ({ row }) => (
          <input
            type="number"
            min={1}
            step={1}
            className={cellNumberClassName}
            defaultValue={row.original.page_number ?? ""}
            disabled={isPending && pendingRowId === row.original.id}
            onBlur={(event) => {
              const raw = event.target.value.trim();
              const value = raw.length > 0 ? Number(raw) : null;

              if (raw.length > 0 && Number.isNaN(value)) {
                return;
              }

              if (value !== row.original.page_number) {
                persistUpdate(row.original.id, { page_number: value });
              }
            }}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex min-w-[120px] flex-col gap-1.5">
            <select
              className={selectClassName}
              value={row.original.status}
              disabled={isPending && pendingRowId === row.original.id}
              onChange={(event) => {
                persistUpdate(row.original.id, {
                  status: event.target.value as TakeoffItem["status"],
                });
              }}
            >
              {TAKEOFF_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <TakeoffStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <input
            className={cellInputClassName}
            defaultValue={row.original.notes ?? ""}
            placeholder="Internal note"
            disabled={isPending && pendingRowId === row.original.id}
            onBlur={(event) => {
              const value = event.target.value.trim() || null;
              if (value !== (row.original.notes ?? "")) {
                persistUpdate(row.original.id, { notes: value });
              }
            }}
          />
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
              <DropdownMenuItem
                onClick={() => {
                  setActionError(null);
                  setPendingRowId(row.original.id);
                  startTransition(async () => {
                    const result = await markTakeoffItemReviewedAction(
                      row.original.id,
                      projectId
                    );
                    setPendingRowId(null);
                    if (result.error) {
                      setActionError(result.error);
                    }
                    router.refresh();
                  });
                }}
              >
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                Mark reviewed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setActionError(null);
                  setPendingRowId(row.original.id);
                  startTransition(async () => {
                    const result = await duplicateTakeoffItemAction(
                      row.original.id,
                      projectId
                    );
                    setPendingRowId(null);
                    if (result.error) {
                      setActionError(result.error);
                    }
                    router.refresh();
                  });
                }}
              >
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                Duplicate item
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      customUnits,
      documents,
      isPending,
      pendingRowId,
      persistUpdate,
      projectId,
      router,
    ]
  );

  const table = useReactTable({
    data: items,
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

    setActionError(null);
    setPendingRowId(deleteTarget.id);

    startTransition(async () => {
      const result = await deleteTakeoffItemAction(deleteTarget.id, projectId);
      setPendingRowId(null);
      setDeleteTarget(null);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <datalist id="takeoff-trades">
        {TAKEOFF_TRADES.map((trade) => (
          <option key={trade} value={trade} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Enter quantities manually. Changes save when you leave a field.
        </p>
        <Button type="button" onClick={handleAddItem} disabled={isPending}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add item
        </Button>
      </div>

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

      {items.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No takeoff lines yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first quantity line to start building this estimate.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={handleAddItem}
            disabled={isPending}
          >
            Add first line
          </Button>
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
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
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
