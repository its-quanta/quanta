"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";

import { RateActiveBadge } from "@/components/rates/rate-active-badge";
import { RateDeleteDialog } from "@/components/rates/rate-delete-dialog";
import { RateFeedback } from "@/components/rates/rate-feedback";
import { RateFormActiveField } from "@/components/rates/rate-form-active-field";
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
import { MATERIAL_CATEGORIES } from "@/src/lib/rates/constants";
import {
  createSupplierRateAction,
  deleteSupplierRateAction,
  updateSupplierRateAction,
} from "@/src/lib/rates/actions";
import { OUTDATED_SUPPLIER_RATE_DAYS, RATE_UNITS } from "@/src/lib/rates/constants";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { SupplierRate } from "@/src/types/database";

type SupplierFormState = {
  supplier: string;
  item: string;
  category: string;
  unit: string;
  rate: string;
  rate_updated_date: string;
  notes: string;
  is_active: boolean;
};

const defaultForm: SupplierFormState = {
  supplier: "",
  item: "",
  category: "",
  unit: "each",
  rate: "",
  rate_updated_date: "",
  notes: "",
  is_active: true,
};

function supplierToForm(rate: SupplierRate): SupplierFormState {
  return {
    supplier: rate.supplier,
    item: rate.item,
    category: rate.category ?? "",
    unit: rate.unit,
    rate: String(rate.rate),
    rate_updated_date: rate.rate_updated_date ?? "",
    notes: rate.notes ?? "",
    is_active: rate.is_active,
  };
}

function isOutdated(rate: SupplierRate): boolean {
  if (!rate.rate_updated_date) {
    return true;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - OUTDATED_SUPPLIER_RATE_DAYS);
  return new Date(rate.rate_updated_date) < cutoff;
}

function parseForm(form: SupplierFormState) {
  const value = form.rate.trim() === "" ? 0 : Number(form.rate);
  if (Number.isNaN(value) || value < 0) {
    return { error: "Rate must be zero or greater." as const };
  }
  return {
    data: {
      supplier: form.supplier,
      item: form.item,
      category: form.category.trim() || null,
      unit: form.unit,
      rate: value,
      rate_updated_date: form.rate_updated_date.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    },
  };
}

type SupplierRatesPanelProps = {
  initialRates: SupplierRate[];
};

export function SupplierRatesPanel({ initialRates }: SupplierRatesPanelProps) {
  const router = useRouter();
  const [rates, setRates] = useState(initialRates);
  const [form, setForm] = useState<SupplierFormState>(defaultForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierRate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  const formFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="supplier-name">Supplier</Label>
        <Input
          id="supplier-name"
          value={form.supplier}
          onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier-item">Item name</Label>
        <Input
          id="supplier-item"
          value={form.item}
          onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier-category">Category</Label>
        <Select
          value={form.category || "__none__"}
          onValueChange={(value) =>
            setForm((f) => ({
              ...f,
              category: value === "__none__" ? "" : value,
            }))
          }
        >
          <SelectTrigger id="supplier-category" className="w-full">
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
      <div className="space-y-2">
        <Label htmlFor="supplier-unit">Unit</Label>
        <Select
          value={form.unit}
          onValueChange={(value) => setForm((f) => ({ ...f, unit: value }))}
        >
          <SelectTrigger id="supplier-unit" className="w-full">
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
        <Label htmlFor="supplier-rate">Rate</Label>
        <Input
          id="supplier-rate"
          type="number"
          min={0}
          step="0.01"
          className="font-mono tabular-nums"
          value={form.rate}
          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="supplier-updated">Updated date</Label>
        <Input
          id="supplier-updated"
          type="date"
          value={form.rate_updated_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, rate_updated_date: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="supplier-notes">Notes</Label>
        <Textarea
          id="supplier-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
        />
      </div>
      <RateFormActiveField
        id="supplier-active"
        value={form.is_active}
        onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
      />
    </div>
  );

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
          ? await createSupplierRateAction(parsed.data!)
          : await updateSupplierRateAction(editTarget!.id, parsed.data!);
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
      setSuccess(mode === "add" ? "Supplier rate added." : "Supplier rate updated.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Supplier price list entries. Flagged when not updated in{" "}
          {OUTDATED_SUPPLIER_RATE_DAYS} days.
        </p>
        <Button type="button" size="sm" onClick={() => { setForm(defaultForm); setAddOpen(true); }}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} className="size-4" />
          Add supplier rate
        </Button>
      </div>

      <RateFeedback error={error} success={success} />

      {rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No supplier rates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Track supplier quotes and price list updates.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Item name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Updated date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.supplier}</TableCell>
                  <TableCell>{rate.item}</TableCell>
                  <TableCell className="text-sm">{rate.category ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {rate.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(rate.rate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">
                        {formatDate(rate.rate_updated_date)}
                      </span>
                      {isOutdated(rate) ? (
                        <Badge variant="outline" className="text-amber-600">
                          Outdated
                        </Badge>
                      ) : null}
                    </div>
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
                          <HugeiconsIcon icon={Edit02Icon} strokeWidth={1.75} className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setForm(supplierToForm(rate));
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
          <form onSubmit={(e) => { e.preventDefault(); submit("add"); }}>
            <DialogHeader>
              <DialogTitle>Add supplier rate</DialogTitle>
              <DialogDescription>Supplier price list entry for your organisation.</DialogDescription>
            </DialogHeader>
            <div className="py-4">{formFields}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <form onSubmit={(e) => { e.preventDefault(); submit("edit"); }}>
            <DialogHeader>
              <DialogTitle>Edit supplier rate</DialogTitle>
            </DialogHeader>
            <div className="py-4">{formFields}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RateDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete supplier rate"
        description={`Remove ${deleteTarget?.supplier} — ${deleteTarget?.item}?`}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteSupplierRateAction(deleteTarget.id);
            if (!result.error) {
              setDeleteTarget(null);
              setSuccess("Supplier rate removed.");
              router.refresh();
            } else setError(result.error);
          });
        }}
        isPending={isPending}
      />
    </div>
  );
}
