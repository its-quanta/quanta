"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";

import { RateActiveBadge } from "@/components/rates/rate-active-badge";
import { RateDeleteDialog } from "@/components/rates/rate-delete-dialog";
import { RateFeedback } from "@/components/rates/rate-feedback";
import { RateFormActiveField } from "@/components/rates/rate-form-active-field";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createMaterialRateAction,
  deleteMaterialRateAction,
  updateMaterialRateAction,
} from "@/src/lib/rates/actions";
import { MATERIAL_CATEGORIES, RATE_UNITS } from "@/src/lib/rates/constants";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import type { MaterialRate } from "@/src/types/database";

type MaterialFormState = {
  name: string;
  supplier: string;
  unit: string;
  cost_rate: string;
  waste_percent: string;
  category: string;
  notes: string;
  is_active: boolean;
};

const defaultForm: MaterialFormState = {
  name: "",
  supplier: "",
  unit: "each",
  cost_rate: "",
  waste_percent: "0",
  category: "",
  notes: "",
  is_active: true,
};

function materialToForm(rate: MaterialRate): MaterialFormState {
  return {
    name: rate.name,
    supplier: rate.supplier ?? "",
    unit: rate.unit,
    cost_rate: String(rate.cost_rate),
    waste_percent: String(rate.waste_percent),
    category: rate.category ?? "",
    notes: rate.notes ?? "",
    is_active: rate.is_active,
  };
}

function parseForm(form: MaterialFormState) {
  const cost = form.cost_rate.trim() === "" ? 0 : Number(form.cost_rate);
  const waste =
    form.waste_percent.trim() === "" ? 0 : Number(form.waste_percent);
  if (Number.isNaN(cost) || cost < 0) {
    return { error: "Cost rate must be zero or greater." as const };
  }
  if (Number.isNaN(waste) || waste < 0 || waste > 100) {
    return { error: "Waste % must be between 0 and 100." as const };
  }
  return {
    data: {
      name: form.name,
      supplier: form.supplier.trim() || null,
      unit: form.unit,
      cost_rate: cost,
      waste_percent: waste,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    },
  };
}

function MaterialRateForm({
  form,
  setForm,
}: {
  form: MaterialFormState;
  setForm: React.Dispatch<React.SetStateAction<MaterialFormState>>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="material-name">Name</Label>
        <Input
          id="material-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="material-supplier">Supplier</Label>
        <Input
          id="material-supplier"
          value={form.supplier}
          onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="material-unit">Unit</Label>
        <Select
          value={form.unit}
          onValueChange={(value) => setForm((f) => ({ ...f, unit: value }))}
        >
          <SelectTrigger id="material-unit" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RATE_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="material-cost">Cost rate</Label>
        <Input
          id="material-cost"
          type="number"
          min={0}
          step="0.01"
          className="font-mono tabular-nums"
          value={form.cost_rate}
          onChange={(e) => setForm((f) => ({ ...f, cost_rate: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="material-waste">Waste %</Label>
        <Input
          id="material-waste"
          type="number"
          min={0}
          max={100}
          step="0.1"
          className="font-mono tabular-nums"
          value={form.waste_percent}
          onChange={(e) =>
            setForm((f) => ({ ...f, waste_percent: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="material-category">Category</Label>
        <Select
          value={form.category || "__none__"}
          onValueChange={(value) =>
            setForm((f) => ({
              ...f,
              category: value === "__none__" ? "" : value,
            }))
          }
        >
          <SelectTrigger id="material-category" className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {MATERIAL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="material-notes">Notes</Label>
        <Textarea
          id="material-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
        />
      </div>
      <RateFormActiveField
        id="material-active"
        value={form.is_active}
        onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
      />
    </div>
  );
}

type MaterialRatesPanelProps = {
  initialRates: MaterialRate[];
};

export function MaterialRatesPanel({ initialRates }: MaterialRatesPanelProps) {
  const router = useRouter();
  const [rates, setRates] = useState(initialRates);
  const [form, setForm] = useState<MaterialFormState>(defaultForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MaterialRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialRate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  function submit(mode: "add" | "edit") {
    setError(null);
    const parsed = parseForm(form);
    if ("error" in parsed && parsed.error) {
      setError(parsed.error);
      return;
    }
    startTransition(async () => {
      const result =
        mode === "add"
          ? await createMaterialRateAction(parsed.data!)
          : await updateMaterialRateAction(editTarget!.id, parsed.data!);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (mode === "add") {
        setAddOpen(false);
        setForm(defaultForm);
      } else {
        setEditTarget(null);
      }
      setSuccess(
        mode === "add" ? "Material rate added." : "Material rate updated."
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Material cost rates with wastage and category for estimating.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setForm(defaultForm);
            setError(null);
            setAddOpen(true);
          }}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} className="size-4" />
          Add material rate
        </Button>
      </div>

      <RateFeedback error={error} success={success} />

      {rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No material rates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add standard material costs for your trade.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost rate</TableHead>
                <TableHead className="text-right">Waste %</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rate.supplier ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{rate.category ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {rate.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(rate.cost_rate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatPercent(rate.waste_percent)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                    {rate.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <RateActiveBadge isActive={rate.is_active} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" type="button">
                          <span className="sr-only">Actions</span>
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
                            setError(null);
                            setForm(materialToForm(rate));
                            setEditTarget(rate);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(rate)}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit("add");
            }}
          >
            <DialogHeader>
              <DialogTitle>Add material rate</DialogTitle>
              <DialogDescription>
                Organisation material library — not linked to a project until
                applied on a tender.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <MaterialRateForm form={form} setForm={setForm} />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit("edit");
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit material rate</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <MaterialRateForm form={form} setForm={setForm} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RateDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete material rate"
        description={`Remove "${deleteTarget?.name}" from your library?`}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteMaterialRateAction(deleteTarget.id);
            if (result.error) setError(result.error);
            else {
              setDeleteTarget(null);
              setSuccess("Material rate removed.");
              router.refresh();
            }
          });
        }}
        isPending={isPending}
      />
    </div>
  );
}
