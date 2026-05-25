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
  createSubcontractorRateAction,
  deleteSubcontractorRateAction,
  updateSubcontractorRateAction,
} from "@/src/lib/rates/actions";
import { SUBCONTRACTOR_RATE_BASIS } from "@/src/lib/rates/constants";
import { formatCurrency } from "@/src/lib/format";
import type { SubcontractorRate } from "@/src/types/database";

type SubcontractorFormState = {
  trade: string;
  supplier: string;
  rate_basis: string;
  rate: string;
  notes: string;
  is_active: boolean;
};

const defaultForm: SubcontractorFormState = {
  trade: "",
  supplier: "",
  rate_basis: "item",
  rate: "",
  notes: "",
  is_active: true,
};

function subcontractorToForm(rate: SubcontractorRate): SubcontractorFormState {
  return {
    trade: rate.trade,
    supplier: rate.supplier ?? "",
    rate_basis: rate.rate_basis,
    rate: String(rate.rate),
    notes: rate.notes ?? "",
    is_active: rate.is_active,
  };
}

function rateBasisLabel(value: string): string {
  return (
    SUBCONTRACTOR_RATE_BASIS.find((b) => b.value === value)?.label ?? value
  );
}

function parseForm(form: SubcontractorFormState) {
  const value = form.rate.trim() === "" ? 0 : Number(form.rate);
  if (Number.isNaN(value) || value < 0) {
    return { error: "Rate must be zero or greater." as const };
  }
  return {
    data: {
      trade: form.trade,
      supplier: form.supplier.trim() || null,
      rate_basis: form.rate_basis,
      rate: value,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    },
  };
}

type SubcontractorRatesPanelProps = {
  initialRates: SubcontractorRate[];
};

export function SubcontractorRatesPanel({
  initialRates,
}: SubcontractorRatesPanelProps) {
  const router = useRouter();
  const [rates, setRates] = useState(initialRates);
  const [form, setForm] = useState<SubcontractorFormState>(defaultForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubcontractorRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubcontractorRate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  const formFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="sub-trade">Trade</Label>
        <Input
          id="sub-trade"
          value={form.trade}
          onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
          placeholder="e.g. Drylining"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sub-supplier">Supplier</Label>
        <Input
          id="sub-supplier"
          value={form.supplier}
          onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
          placeholder="Subcontractor name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sub-basis">Rate basis</Label>
        <Select
          value={form.rate_basis}
          onValueChange={(value) => setForm((f) => ({ ...f, rate_basis: value }))}
        >
          <SelectTrigger id="sub-basis" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBCONTRACTOR_RATE_BASIS.map((basis) => (
              <SelectItem key={basis.value} value={basis.value}>
                {basis.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sub-rate">Rate</Label>
        <Input
          id="sub-rate"
          type="number"
          min={0}
          step="0.01"
          className="font-mono tabular-nums"
          value={form.rate}
          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="sub-notes">Notes</Label>
        <Textarea
          id="sub-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
        />
      </div>
      <RateFormActiveField
        id="sub-active"
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
          ? await createSubcontractorRateAction(parsed.data!)
          : await updateSubcontractorRateAction(editTarget!.id, parsed.data!);
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
        mode === "add" ? "Subcontractor rate added." : "Subcontractor rate updated."
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Subcontractor allowances by trade and rate basis.
        </p>
        <Button type="button" size="sm" onClick={() => { setForm(defaultForm); setAddOpen(true); }}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} className="size-4" />
          Add subcontractor rate
        </Button>
      </div>

      <RateFeedback error={error} success={success} />

      {rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No subcontractor rates yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Record trade packages and lump-sum allowances.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Rate basis</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.trade}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rate.supplier ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rateBasisLabel(rate.rate_basis)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(rate.rate)}
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
                            setForm(subcontractorToForm(rate));
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
              <DialogTitle>Add subcontractor rate</DialogTitle>
              <DialogDescription>
                Trade subcontract allowances for your organisation library.
              </DialogDescription>
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
              <DialogTitle>Edit subcontractor rate</DialogTitle>
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
        title="Delete subcontractor rate"
        description={`Remove ${deleteTarget?.trade} rate?`}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteSubcontractorRateAction(deleteTarget.id);
            if (!result.error) {
              setDeleteTarget(null);
              setSuccess("Subcontractor rate removed.");
              router.refresh();
            } else setError(result.error);
          });
        }}
        isPending={isPending}
      />
    </div>
  );
}
