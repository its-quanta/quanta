"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSEMBLY_TRADES, ASSEMBLY_UNITS } from "@/src/lib/assemblies/constants";

export type AssemblyPackageFormValues = {
  name: string;
  description: string;
  trade: string;
  unit: string;
  default_margin_percentage: string;
  default_markup_percentage: string;
  standard_reference: string;
  specification_reference: string;
  notes: string;
  is_active: boolean;
};

export const defaultAssemblyPackageFormValues: AssemblyPackageFormValues = {
  name: "",
  description: "",
  trade: "",
  unit: "m2",
  default_margin_percentage: "",
  default_markup_percentage: "",
  standard_reference: "",
  specification_reference: "",
  notes: "",
  is_active: true,
};

export function assemblyPackageToFormValues(
  pkg: {
    name: string;
    description: string | null;
    trade: string | null;
    unit: string;
    default_margin_percentage: number | null;
    default_markup_percentage: number | null;
    standard_reference: string | null;
    specification_reference: string | null;
    notes: string | null;
    is_active: boolean;
  }
): AssemblyPackageFormValues {
  return {
    name: pkg.name,
    description: pkg.description ?? "",
    trade: pkg.trade ?? "",
    unit: pkg.unit,
    default_margin_percentage:
      pkg.default_margin_percentage != null
        ? String(pkg.default_margin_percentage)
        : "",
    default_markup_percentage:
      pkg.default_markup_percentage != null
        ? String(pkg.default_markup_percentage)
        : "",
    standard_reference: pkg.standard_reference ?? "",
    specification_reference: pkg.specification_reference ?? "",
    notes: pkg.notes ?? "",
    is_active: pkg.is_active,
  };
}

export function parseAssemblyPackageForm(values: AssemblyPackageFormValues): {
  error?: string;
  data?: {
    name: string;
    description: string | null;
    trade: string | null;
    unit: string;
    default_margin_percentage: number | null;
    default_markup_percentage: number | null;
    standard_reference: string | null;
    specification_reference: string | null;
    notes: string | null;
    is_active: boolean;
  };
} {
  const name = values.name.trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const margin =
    values.default_margin_percentage.trim() === ""
      ? null
      : Number(values.default_margin_percentage);
  const markup =
    values.default_markup_percentage.trim() === ""
      ? null
      : Number(values.default_markup_percentage);

  if (margin !== null && (Number.isNaN(margin) || margin < 0 || margin >= 100)) {
    return { error: "Margin % must be between 0 and 99.9." };
  }

  if (markup !== null && (Number.isNaN(markup) || markup < 0)) {
    return { error: "Markup % must be zero or greater." };
  }

  if (
    margin !== null &&
    margin > 0 &&
    markup !== null &&
    markup > 0
  ) {
    return {
      error:
        "Use either margin % or markup %, not both. Margin takes priority when both are set.",
    };
  }

  return {
    data: {
      name,
      description: values.description.trim() || null,
      trade: values.trade.trim() || null,
      unit: values.unit.trim() || "m2",
      default_margin_percentage: margin,
      default_markup_percentage: markup,
      standard_reference: values.standard_reference.trim() || null,
      specification_reference: values.specification_reference.trim() || null,
      notes: values.notes.trim() || null,
      is_active: values.is_active,
    },
  };
}

type AssemblyPackageFormFieldsProps = {
  values: AssemblyPackageFormValues;
  onChange: (values: AssemblyPackageFormValues) => void;
  showStatus?: boolean;
};

export function AssemblyPackageFormFields({
  values,
  onChange,
  showStatus = false,
}: AssemblyPackageFormFieldsProps) {
  function update<K extends keyof AssemblyPackageFormValues>(
    key: K,
    value: AssemblyPackageFormValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="assembly-name">Name</Label>
        <Input
          id="assembly-name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder='e.g. 90×45 H1.2 framed wall with 13mm GIB'
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="assembly-description">Description</Label>
        <Textarea
          id="assembly-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assembly-trade">Trade</Label>
        <Select
          value={values.trade || "__none__"}
          onValueChange={(v) => update("trade", v === "__none__" ? "" : v)}
        >
          <SelectTrigger id="assembly-trade" className="w-full">
            <SelectValue placeholder="Select trade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {ASSEMBLY_TRADES.map((trade) => (
              <SelectItem key={trade} value={trade}>
                {trade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assembly-unit">Unit</Label>
        <Select
          value={values.unit}
          onValueChange={(v) => update("unit", v)}
        >
          <SelectTrigger id="assembly-unit" className="w-full">
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
        <Label htmlFor="assembly-margin">Margin %</Label>
        <Input
          id="assembly-margin"
          type="number"
          min={0}
          max={99.9}
          step="0.1"
          className="font-mono tabular-nums"
          value={values.default_margin_percentage}
          onChange={(e) => update("default_margin_percentage", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Margin takes priority when both margin and markup are set.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assembly-markup">Markup %</Label>
        <Input
          id="assembly-markup"
          type="number"
          min={0}
          step="0.1"
          className="font-mono tabular-nums"
          value={values.default_markup_percentage}
          onChange={(e) => update("default_markup_percentage", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assembly-standard">Standard reference</Label>
        <Input
          id="assembly-standard"
          value={values.standard_reference}
          onChange={(e) => update("standard_reference", e.target.value)}
          placeholder="e.g. NZS 3604"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assembly-spec">Specification reference</Label>
        <Input
          id="assembly-spec"
          value={values.specification_reference}
          onChange={(e) => update("specification_reference", e.target.value)}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="assembly-notes">Notes</Label>
        <Textarea
          id="assembly-notes"
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
        />
      </div>
      {showStatus ? (
        <div className="space-y-2">
          <Label htmlFor="assembly-status">Status</Label>
          <Select
            value={values.is_active ? "active" : "inactive"}
            onValueChange={(v) => update("is_active", v === "active")}
          >
            <SelectTrigger id="assembly-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
