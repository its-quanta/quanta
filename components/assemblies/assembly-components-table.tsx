"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";

import {
  AssemblyComponentDialog,
  type AssemblyComponentFormValues,
  componentToFormValues,
  defaultComponentFormValues,
  parseComponentForm,
} from "@/components/assemblies/assembly-component-dialog";
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
import { formatCurrency, formatPercent } from "@/src/lib/format";
import { ASSEMBLY_ITEM_TYPES } from "@/src/lib/assemblies/constants";
import {
  createAssemblyPackageItemAction,
  deleteAssemblyPackageItemAction,
  updateAssemblyPackageItemAction,
} from "@/src/lib/assemblies/actions";
import type { AssemblyPackageItem } from "@/src/types/database";

type AssemblyComponentsTableProps = {
  packageId: string;
  packageUnit: string;
  initialItems: AssemblyPackageItem[];
};

function itemTypeLabel(type: string): string {
  return ASSEMBLY_ITEM_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function AssemblyComponentsTable({
  packageId,
  packageUnit,
  initialItems,
}: AssemblyComponentsTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssemblyPackageItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssemblyPackageItem | null>(
    null
  );
  const [form, setForm] = useState<AssemblyComponentFormValues>(
    defaultComponentFormValues
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function openAdd() {
    setForm(defaultComponentFormValues);
    setError(null);
    setAddOpen(true);
  }

  function submitComponent(mode: "add" | "edit") {
    setError(null);
    const parsed = parseComponentForm(form);
    if (parsed.error || !parsed.data) {
      setError(parsed.error ?? "Invalid component.");
      return;
    }

    const payload = parsed.data;

    startTransition(async () => {
      const result =
        mode === "add"
          ? await createAssemblyPackageItemAction(packageId, payload)
          : await updateAssemblyPackageItemAction(
              editItem!.id,
              packageId,
              payload
            );

      if (result.error) {
        setError(result.error);
        return;
      }

      setAddOpen(false);
      setEditItem(null);
      setForm(defaultComponentFormValues);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteAssemblyPackageItemAction(
        deleteTarget.id,
        packageId
      );
      if (result.error) {
        setError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Components per {packageUnit}. Quantities are per one package unit.
        </p>
        <Button type="button" size="sm" onClick={openAdd}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} className="size-4" />
          Add component
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No components yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add materials, labour, plant, subcontractor lines, or allowances.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Qty / unit</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Waste %</TableHead>
                <TableHead className="text-right">Cost rate</TableHead>
                <TableHead className="text-right">Cost / {packageUnit}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {itemTypeLabel(item.item_type)}
                  </TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {item.quantity_per_unit}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatPercent(item.wastage_percentage)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(item.cost_rate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(item.total_cost_per_unit)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" type="button">
                          <HugeiconsIcon
                            icon={Edit02Icon}
                            strokeWidth={1.75}
                            className="size-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setForm(componentToFormValues(item));
                            setEditItem(item);
                            setError(null);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssemblyComponentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add component"
        description="Quantities apply per one package unit."
        form={form}
        onFormChange={setForm}
        error={error}
        isPending={isPending}
        onSubmit={() => submitComponent("add")}
      />

      <AssemblyComponentDialog
        open={editItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setForm(defaultComponentFormValues);
          }
        }}
        title="Edit component"
        form={form}
        onFormChange={setForm}
        error={error}
        isPending={isPending}
        onSubmit={() => submitComponent("edit")}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete component</DialogTitle>
            <DialogDescription>
              Remove &quot;{deleteTarget?.item_name}&quot; from this assembly?
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
