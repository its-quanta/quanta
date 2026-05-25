"use client";

import { useMemo } from "react";

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
import {
  calculatePricingTotals,
  normaliseMarkupMargin,
} from "@/src/lib/pricing/calculations";
import { PRICING_METHODS } from "@/src/lib/pricing/constants";
import { formatCurrency } from "@/src/lib/format";
import type { PricingMethod } from "@/src/types/database";

export type PricingFormValues = {
  takeoff_item_id: string;
  pricing_method: PricingMethod;
  quantity: string;
  unit: string;
  cost_rate: string;
  markup_percentage: string;
  margin_percentage: string;
  sell_rate: string;
  sell_rate_overridden: boolean;
  notes: string;
};

export const defaultPricingFormValues: PricingFormValues = {
  takeoff_item_id: "",
  pricing_method: "each",
  quantity: "0",
  unit: "each",
  cost_rate: "0",
  markup_percentage: "",
  margin_percentage: "",
  sell_rate: "0",
  sell_rate_overridden: false,
  notes: "",
};

type PricingFormFieldsProps = {
  form: PricingFormValues;
  onChange: <K extends keyof PricingFormValues>(
    key: K,
    value: PricingFormValues[K]
  ) => void;
  disabled?: boolean;
  idPrefix: string;
  showTakeoffSelect?: boolean;
  takeoffOptions?: { id: string; label: string }[];
  lockTakeoff?: boolean;
};

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PricingFormFields({
  form,
  onChange,
  disabled,
  idPrefix,
  showTakeoffSelect = false,
  takeoffOptions = [],
  lockTakeoff = false,
}: PricingFormFieldsProps) {
  const preview = useMemo(() => {
    const quantity = parseNumber(form.quantity);
    const costRate = parseNumber(form.cost_rate);
    const markup = form.markup_percentage.trim()
      ? parseNumber(form.markup_percentage)
      : null;
    const margin = form.margin_percentage.trim()
      ? parseNumber(form.margin_percentage)
      : null;
    const sellRateInput = form.sell_rate.trim()
      ? parseNumber(form.sell_rate)
      : null;

    return calculatePricingTotals({
      quantity,
      cost_rate: costRate,
      markup_percentage: markup,
      margin_percentage: margin,
      sell_rate: sellRateInput,
      sell_rate_overridden: form.sell_rate_overridden,
    });
  }, [form]);

  const bothMarkupAndMargin =
    form.markup_percentage.trim() !== "" && form.margin_percentage.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      {showTakeoffSelect ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-takeoff`}>Takeoff item</Label>
          <Select
            value={form.takeoff_item_id || undefined}
            onValueChange={(value) => onChange("takeoff_item_id", value)}
            disabled={disabled || lockTakeoff}
          >
            <SelectTrigger id={`${idPrefix}-takeoff`} className="w-full">
              <SelectValue placeholder="Select takeoff line" />
            </SelectTrigger>
            <SelectContent>
              {takeoffOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-method`}>Pricing method</Label>
          <Select
            value={form.pricing_method}
            onValueChange={(value) =>
              onChange("pricing_method", value as PricingMethod)
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-method`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICING_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
          <Input
            id={`${idPrefix}-unit`}
            value={form.unit}
            onChange={(event) => onChange("unit", event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-quantity`}>Quantity</Label>
          <Input
            id={`${idPrefix}-quantity`}
            type="number"
            min={0}
            step="any"
            className="font-mono tabular-nums"
            value={form.quantity}
            onChange={(event) => onChange("quantity", event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-cost-rate`}>Cost rate</Label>
          <Input
            id={`${idPrefix}-cost-rate`}
            type="number"
            min={0}
            step="any"
            className="font-mono tabular-nums"
            value={form.cost_rate}
            onChange={(event) => onChange("cost_rate", event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-markup`}>Markup %</Label>
          <Input
            id={`${idPrefix}-markup`}
            type="number"
            min={0}
            step="any"
            className="font-mono tabular-nums"
            value={form.markup_percentage}
            onChange={(event) => {
              onChange("markup_percentage", event.target.value);
              if (event.target.value.trim()) {
                onChange("margin_percentage", "");
              }
            }}
            disabled={disabled || form.sell_rate_overridden}
            placeholder="Optional"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-margin`}>Margin %</Label>
          <Input
            id={`${idPrefix}-margin`}
            type="number"
            min={0}
            max={99.99}
            step="any"
            className="font-mono tabular-nums"
            value={form.margin_percentage}
            onChange={(event) => {
              onChange("margin_percentage", event.target.value);
              if (event.target.value.trim()) {
                onChange("markup_percentage", "");
              }
            }}
            disabled={disabled || form.sell_rate_overridden}
            placeholder="Optional"
          />
        </div>
      </div>

      {bothMarkupAndMargin ? (
        <p className="text-xs text-amber-800" role="status">
          Margin takes priority over markup. Clear one field before saving.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Use markup or margin, not both. Margin is calculated on sell price.
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={form.sell_rate_overridden}
            onChange={(event) =>
              onChange("sell_rate_overridden", event.target.checked)
            }
            disabled={disabled}
          />
          Override sell rate manually
        </label>

        {form.sell_rate_overridden ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-sell-rate`}>Sell rate</Label>
            <Input
              id={`${idPrefix}-sell-rate`}
              type="number"
              min={0}
              step="any"
              className="font-mono tabular-nums"
              value={form.sell_rate}
              onChange={(event) => onChange("sell_rate", event.target.value)}
              disabled={disabled}
            />
          </div>
        ) : (
          <p className="font-mono text-sm tabular-nums text-foreground">
            Calculated sell rate: {formatCurrency(preview.sell_rate)}
          </p>
        )}
      </div>

      <div className="grid gap-2 rounded-md border border-border bg-card p-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Total cost</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(preview.total_cost)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Total sell</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(preview.total_sell)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Gross profit</span>
          <span className="font-mono tabular-nums text-emerald-700">
            {formatCurrency(preview.gross_profit)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
}

export function parsePricingFormValues(
  form: PricingFormValues
): { error?: string; data?: import("@/src/types/database").PricingItemInput } {
  if (!form.takeoff_item_id) {
    return { error: "Select a takeoff item." };
  }

  const quantity = parseNumber(form.quantity);
  const costRate = parseNumber(form.cost_rate);

  if (quantity < 0 || costRate < 0) {
    return { error: "Quantity and cost rate cannot be negative." };
  }

  const markup = form.markup_percentage.trim()
    ? parseNumber(form.markup_percentage)
    : null;
  const margin = form.margin_percentage.trim()
    ? parseNumber(form.margin_percentage)
    : null;

  if (markup !== null && markup < 0) {
    return { error: "Markup cannot be negative." };
  }

  if (margin !== null && (margin < 0 || margin >= 100)) {
    return { error: "Margin must be between 0 and 100%." };
  }

  const { markup_percentage, margin_percentage } = normaliseMarkupMargin(
    markup,
    margin
  );

  const sellRate = form.sell_rate.trim() ? parseNumber(form.sell_rate) : null;

  return {
    data: {
      takeoff_item_id: form.takeoff_item_id,
      pricing_method: form.pricing_method,
      quantity,
      unit: form.unit.trim() || "each",
      cost_rate: costRate,
      markup_percentage,
      margin_percentage,
      sell_rate: sellRate,
      sell_rate_overridden: form.sell_rate_overridden,
      notes: form.notes.trim() || null,
    },
  };
}

export function pricingItemToFormValues(
  item: import("@/src/lib/pricing/queries").PricingItemWithTakeoff
): PricingFormValues {
  return {
    takeoff_item_id: item.takeoff_item_id,
    pricing_method: item.pricing_method,
    quantity: String(item.quantity),
    unit: item.unit,
    cost_rate: String(item.cost_rate),
    markup_percentage:
      item.markup_percentage !== null ? String(item.markup_percentage) : "",
    margin_percentage:
      item.margin_percentage !== null ? String(item.margin_percentage) : "",
    sell_rate: String(item.sell_rate),
    sell_rate_overridden: item.sell_rate_overridden,
    notes: item.notes ?? "",
  };
}

export function takeoffItemToPricingFormDefaults(
  takeoffItemId: string,
  quantity: number,
  unit: string
): Partial<PricingFormValues> {
  return {
    takeoff_item_id: takeoffItemId,
    quantity: String(quantity),
    unit,
  };
}
