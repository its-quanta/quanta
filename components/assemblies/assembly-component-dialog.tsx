"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSEMBLY_ITEM_TYPES, ASSEMBLY_UNITS } from "@/src/lib/assemblies/constants";
import type {
  AssemblyPackageItem,
  AssemblyPackageItemInput,
} from "@/src/types/database";

export type AssemblyComponentFormValues = {
  item_type: string;
  item_name: string;
  quantity_per_unit: string;
  unit: string;
  wastage_percentage: string;
  cost_rate: string;
  sell_rate: string;
  notes: string;
};

export const defaultComponentFormValues: AssemblyComponentFormValues = {
  item_type: "material",
  item_name: "",
  quantity_per_unit: "",
  unit: "each",
  wastage_percentage: "0",
  cost_rate: "",
  sell_rate: "",
  notes: "",
};

export function componentToFormValues(
  item: AssemblyPackageItem
): AssemblyComponentFormValues {
  return {
    item_type: item.item_type,
    item_name: item.item_name,
    quantity_per_unit: String(item.quantity_per_unit),
    unit: item.unit,
    wastage_percentage: String(item.wastage_percentage),
    cost_rate: String(item.cost_rate),
    sell_rate: item.sell_rate != null ? String(item.sell_rate) : "",
    notes: item.notes ?? "",
  };
}

export function parseComponentForm(
  form: AssemblyComponentFormValues
): { error?: string; data?: AssemblyPackageItemInput } {
  const item_name = form.item_name.trim();
  if (!item_name) {
    return { error: "Item name is required." };
  }

  const quantity = form.quantity_per_unit.trim() === "" ? 0 : Number(form.quantity_per_unit);
  const wastage =
    form.wastage_percentage.trim() === "" ? 0 : Number(form.wastage_percentage);
  const cost_rate = form.cost_rate.trim() === "" ? 0 : Number(form.cost_rate);
  const sell_rate =
    form.sell_rate.trim() === "" ? null : Number(form.sell_rate);

  if (Number.isNaN(quantity) || quantity < 0) {
    return { error: "Quantity per unit must be zero or greater." };
  }

  if (Number.isNaN(wastage) || wastage < 0 || wastage > 100) {
    return { error: "Wastage % must be between 0 and 100." };
  }

  if (Number.isNaN(cost_rate) || cost_rate < 0) {
    return { error: "Cost rate must be zero or greater." };
  }

  if (sell_rate !== null && (Number.isNaN(sell_rate) || sell_rate < 0)) {
    return { error: "Sell rate must be zero or greater when provided." };
  }

  const item_type = form.item_type;
  if (
    item_type !== "material" &&
    item_type !== "labour" &&
    item_type !== "plant" &&
    item_type !== "subcontractor" &&
    item_type !== "allowance"
  ) {
    return { error: "Select a valid component type." };
  }

  return {
    data: {
      item_type,
      item_name,
      quantity_per_unit: quantity,
      unit: form.unit.trim() || "each",
      wastage_percentage: wastage,
      cost_rate,
      sell_rate,
      notes: form.notes.trim() || null,
    },
  };
}

type AssemblyComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  form: AssemblyComponentFormValues;
  onFormChange: (form: AssemblyComponentFormValues) => void;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
};

export function AssemblyComponentDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  onFormChange,
  error,
  isPending,
  onSubmit,
}: AssemblyComponentDialogProps) {
  function update<K extends keyof AssemblyComponentFormValues>(
    key: K,
    value: AssemblyComponentFormValues[K]
  ) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="comp-type">Type</Label>
              <Select
                value={form.item_type}
                onValueChange={(v) => update("item_type", v)}
              >
                <SelectTrigger id="comp-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSEMBLY_ITEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="comp-name">Item name</Label>
              <Input
                id="comp-name"
                value={form.item_name}
                onChange={(e) => update("item_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-qty">Quantity per unit</Label>
              <Input
                id="comp-qty"
                type="number"
                min={0}
                step="any"
                className="font-mono tabular-nums"
                value={form.quantity_per_unit}
                onChange={(e) => update("quantity_per_unit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-unit">Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => update("unit", v)}
              >
                <SelectTrigger id="comp-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSEMBLY_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-waste">Wastage %</Label>
              <Input
                id="comp-waste"
                type="number"
                min={0}
                max={100}
                step="0.1"
                className="font-mono tabular-nums"
                value={form.wastage_percentage}
                onChange={(e) => update("wastage_percentage", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-cost">Cost rate</Label>
              <Input
                id="comp-cost"
                type="number"
                min={0}
                step="0.01"
                className="font-mono tabular-nums"
                value={form.cost_rate}
                onChange={(e) => update("cost_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-sell">Sell rate (optional)</Label>
              <Input
                id="comp-sell"
                type="number"
                min={0}
                step="0.01"
                className="font-mono tabular-nums"
                value={form.sell_rate}
                onChange={(e) => update("sell_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="comp-notes">Notes</Label>
              <Textarea
                id="comp-notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  );
}
