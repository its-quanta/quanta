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
  createLabourRateAction,
  deleteLabourRateAction,
  updateLabourRateAction,
} from "@/src/lib/rates/actions";
import { RATE_UNITS } from "@/src/lib/rates/constants";
import { formatCurrency } from "@/src/lib/format";
import type { LabourRate } from "@/src/types/database";

type LabourFormState = {
  name: string;
  role: string;
  unit: string;
  cost_rate: string;
  charge_rate: string;
  notes: string;
  is_active: boolean;
};

const defaultForm: LabourFormState = {
  name: "",
  role: "",
  unit: "hour",
  cost_rate: "",
  charge_rate: "",
  notes: "",
  is_active: true,
};

function labourToForm(rate: LabourRate): LabourFormState {
  return {
    name: rate.name,
    role: rate.role ?? "",
    unit: rate.unit,
    cost_rate: String(rate.cost_rate),
    charge_rate: String(rate.charge_rate),
    notes: rate.notes ?? "",
    is_active: rate.is_active,
  };
}

function parseForm(form: LabourFormState) {
  const cost = form.cost_rate.trim() === "" ? 0 : Number(form.cost_rate);
  const charge = form.charge_rate.trim() === "" ? 0 : Number(form.charge_rate);
  if (Number.isNaN(cost) || cost < 0) {
    return { error: "Cost rate must be zero or greater." as const };
  }
  if (Number.isNaN(charge) || charge < 0) {
    return { error: "Charge rate must be zero or greater." as const };
  }
  return {
    data: {
      name: form.name,
      role: form.role.trim() || null,
      unit: form.unit,
      cost_rate: cost,
      charge_rate: charge,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    },
  };
}

type LabourRatesPanelProps = {
  initialRates: LabourRate[];
};

export function LabourRatesPanel({ initialRates }: LabourRatesPanelProps) {
  const router = useRouter();
  const [rates, setRates] = useState(initialRates);
  const [form, setForm] = useState<LabourFormState>(defaultForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabourRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabourRate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  function resetDialogs() {
    setForm(defaultForm);
    setError(null);
  }

  function handleAddSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = parseForm(form);
    if ("error" in parsed && parsed.error) {
      setError(parsed.error);
      return;
    }
    startTransition(async () => {
      const result = await createLabourRateAction(parsed.data!);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAddOpen(false);
      resetDialogs();
      setSuccess("Labour rate added.");
      router.refresh();
    });
  }

  function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    setError(null);
    const parsed = parseForm(form);
    if ("error" in parsed && parsed.error) {
      setError(parsed.error);
      return;
    }
    startTransition(async () => {
      const result = await updateLabourRateAction(editTarget.id, parsed.data!);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditTarget(null);
      resetDialogs();
      setSuccess("Labour rate updated.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteLabourRateAction(deleteTarget.id);
      if (result.error) {
        setError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setSuccess("Labour rate removed.");
      router.refresh();
    });
  }

  const formFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="labour-name">Name</Label>
        <Input
          id="labour-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Ceiling fixer"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labour-role">Role</Label>
        <Input
          id="labour-role"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          placeholder="e.g. Fixer"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labour-unit">Unit</Label>
        <Select
          value={form.unit}
          onValueChange={(value) => setForm((f) => ({ ...f, unit: value }))}
        >
          <SelectTrigger id="labour-unit" className="w-full">
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
        <Label htmlFor="labour-cost">Cost rate</Label>
        <Input
          id="labour-cost"
          type="number"
          min={0}
          step="0.01"
          className="font-mono tabular-nums"
          value={form.cost_rate}
          onChange={(e) => setForm((f) => ({ ...f, cost_rate: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labour-charge">Charge rate</Label>
        <Input
          id="labour-charge"
          type="number"
          min={0}
          step="0.01"
          className="font-mono tabular-nums"
          value={form.charge_rate}
          onChange={(e) =>
            setForm((f) => ({ ...f, charge_rate: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="labour-notes">Notes</Label>
        <Textarea
          id="labour-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
        />
      </div>
      <RateFormActiveField
        id="labour-active"
        value={form.is_active}
        onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Standard labour roles and charge rates for your organisation.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            resetDialogs();
            setAddOpen(true);
          }}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} className="size-4" />
          Add labour rate
        </Button>
      </div>

      <RateFeedback error={error} success={success} />

      {rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No labour rates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first labour rate to reuse across tenders.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost rate</TableHead>
                <TableHead className="text-right">Charge rate</TableHead>
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
                    {rate.role ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {rate.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(rate.cost_rate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(rate.charge_rate)}
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
                            setForm(labourToForm(rate));
                            setEditTarget(rate);
                          }}
                        >
                          <HugeiconsIcon
                            icon={Edit02Icon}
                            strokeWidth={1.75}
                            className="size-4"
                          />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(rate)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            strokeWidth={1.75}
                            className="size-4"
                          />
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
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>Add labour rate</DialogTitle>
              <DialogDescription>
                Saved to your organisation library. Review before applying on
                tenders.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">{formFields}</div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={isPending}
              >
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
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            resetDialogs();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit labour rate</DialogTitle>
            </DialogHeader>
            <div className="py-4">{formFields}</div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RateDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete labour rate"
        description={`Remove "${deleteTarget?.name}" from your library? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
