"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { dispatchEstimateUpdated } from "@/components/estimate/estimate-events";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import {
  buildPricingFormNumbers,
  deriveDefaultSellRate,
  methodLabelForMode,
  pricingMethodForMode,
  resolveEstimatePricingMode,
  type EstimatePricingModeOverride,
} from "@/src/lib/estimate/pricing-derivation";
import {
  calculateEstimateItemPricing,
  pricingTotalsNeedSync,
} from "@/src/lib/estimate/item-pricing";
import {
  createPricingItemAction,
  updatePricingItemAction,
} from "@/src/lib/pricing/actions";
import type {
  AssemblyPackage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type DetailPricingSectionProps = {
  projectId: string;
  takeoffItem: TakeoffItem;
  assembly: TakeoffItemAssemblyWithPackage | null;
  pricing: PricingItem | null;
  appliedPackage: AssemblyPackage | null;
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  modeOverride: EstimatePricingModeOverride | null;
  focusSellRate?: boolean;
  showPackageComponentsWarning?: boolean;
  onPricingSaved: () => void;
  onError: (message: string) => void;
  className?: string;
};

type SaveState = "idle" | "saving" | "saved" | "updated" | "error";

type LastEdited = "cost_rate" | "sell_rate" | "total_cost" | "total_sell" | null;

function parseInputNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatRateValue(value: number | null): string {
  if (value === null || value <= 0) {
    return "";
  }
  return String(value);
}

function formatMoneyInput(value: number | null): string {
  if (value === null || value <= 0) {
    return "";
  }
  return String(value);
}

export function DetailPricingSection({
  projectId,
  takeoffItem,
  assembly,
  pricing,
  appliedPackage,
  materialItems,
  labourItems,
  modeOverride,
  focusSellRate,
  showPackageComponentsWarning = false,
  onPricingSaved,
  onError,
  className,
}: DetailPricingSectionProps) {
  const sellRateRef = useRef<HTMLInputElement>(null);
  const ensuredMethodRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastEdited, setLastEdited] = useState<LastEdited>(null);

  const mode = resolveEstimatePricingMode(assembly, pricing, modeOverride);

  const calculated = useMemo(
    () =>
      calculateEstimateItemPricing({
        takeoffItem,
        materialItems,
        labourItems,
        pricingItem: pricing,
        packageAssembly: assembly,
        appliedPackage,
      }),
    [
      takeoffItem,
      materialItems,
      labourItems,
      pricing,
      assembly,
      appliedPackage,
    ]
  );

  const derivedCostRate = calculated.costRate;

  const [costRateInput, setCostRateInput] = useState("");
  const [sellRateInput, setSellRateInput] = useState("");
  const [totalCostInput, setTotalCostInput] = useState("");
  const [totalSellInput, setTotalSellInput] = useState("");

  const syncFormFromSource = useCallback(() => {
    const quantity = takeoffItem.quantity;
    const costRate =
      mode === "package"
        ? calculated.costRate
        : (pricing?.cost_rate ?? 0);
    const defaultSell = deriveDefaultSellRate({ pricing, appliedPackage });
    const sellRate =
      mode === "package"
        ? calculated.sellRate
        : (pricing?.sell_rate ?? defaultSell ?? 0);

    const numbers =
      mode === "package"
        ? {
            cost_rate: calculated.costRate,
            sell_rate: calculated.sellRate,
            total_cost: calculated.totalCost,
            total_sell: calculated.totalSell,
          }
        : buildPricingFormNumbers({
            quantity,
            cost_rate: costRate,
            sell_rate: sellRate,
            sell_rate_overridden:
              pricing?.sell_rate_overridden ?? false,
          });

    setCostRateInput(formatRateValue(numbers.cost_rate));
    setSellRateInput(formatRateValue(numbers.sell_rate));
    setTotalCostInput(formatMoneyInput(numbers.total_cost));
    setTotalSellInput(formatMoneyInput(numbers.total_sell));
    setLastEdited(null);
    setSaveState("idle");
    setSaveError(null);
  }, [
    takeoffItem.quantity,
    mode,
    calculated,
    pricing,
    appliedPackage,
  ]);

  useEffect(() => {
    syncFormFromSource();
    ensuredMethodRef.current = null;
  }, [
    syncFormFromSource,
    takeoffItem.id,
    takeoffItem.quantity,
    takeoffItem.unit,
    pricing?.id,
    pricing?.updated_at,
    materialItems,
    labourItems,
    calculated.totalCost,
    calculated.costRate,
  ]);

  useEffect(() => {
    if (focusSellRate && sellRateRef.current) {
      sellRateRef.current.focus();
      sellRateRef.current.select();
    }
  }, [focusSellRate, takeoffItem.id]);

  const quantity = takeoffItem.quantity;
  const unit = takeoffItem.unit?.trim() || "each";

  const liveNumbers = useMemo(() => {
    if (mode === "package") {
      return {
        quantity,
        unit: "",
        cost_rate: calculated.costRate,
        sell_rate: calculated.sellRate,
        sell_rate_overridden:
          pricing?.sell_rate_overridden ?? calculated.sellRate > 0,
        total_cost: calculated.totalCost,
        total_sell: calculated.totalSell,
        gross_profit: calculated.grossProfit,
        margin_percentage: calculated.marginPercent,
      };
    }

    const costRate = parseInputNumber(costRateInput) ?? 0;
    const sellRate = parseInputNumber(sellRateInput) ?? 0;
    const totalCost = parseInputNumber(totalCostInput);
    const totalSell = parseInputNumber(totalSellInput);

    return buildPricingFormNumbers({
      quantity,
      cost_rate: costRate,
      sell_rate: sellRate,
      sell_rate_overridden:
        lastEdited === "sell_rate" ||
        lastEdited === "total_sell" ||
        (pricing?.sell_rate_overridden ?? false),
      total_cost: totalCost ?? undefined,
      total_sell: totalSell ?? undefined,
      lastEdited,
    });
  }, [
    mode,
    calculated,
    costRateInput,
    sellRateInput,
    totalCostInput,
    totalSellInput,
    quantity,
    lastEdited,
    pricing?.sell_rate_overridden,
  ]);

  useEffect(() => {
    if (mode === "package") {
      return;
    }
    if (lastEdited === "total_cost" || lastEdited === "total_sell") {
      return;
    }
    setTotalCostInput(formatMoneyInput(liveNumbers.total_cost));
    setTotalSellInput(formatMoneyInput(liveNumbers.total_sell));
  }, [mode, liveNumbers.total_cost, liveNumbers.total_sell, lastEdited]);

  const syncBuildUpPricingRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "package" || !pricing?.id) {
      return;
    }

    if (!pricingTotalsNeedSync(calculated, pricing, quantity)) {
      return;
    }

    const syncKey = `${pricing.id}:${calculated.totalCost}:${calculated.costRate}:${quantity}`;
    if (syncBuildUpPricingRef.current === syncKey) {
      return;
    }
    syncBuildUpPricingRef.current = syncKey;

    setSaveState("saving");
    setSaveError(null);

    startTransition(async () => {
      const payload = {
        pricing_method: pricing.pricing_method,
        quantity,
        unit,
        cost_rate: calculated.costRate,
        sell_rate: calculated.sellRate,
        sell_rate_overridden: pricing.sell_rate_overridden,
        margin_percentage: calculated.marginPercent,
        markup_percentage: null as number | null,
        notes: pricing.notes ?? null,
      };

      const result = await updatePricingItemAction(pricing.id, projectId, payload);

      if (result.error) {
        syncBuildUpPricingRef.current = null;
        setSaveState("error");
        setSaveError(result.error);
        onError(result.error);
        return;
      }

      dispatchEstimateUpdated(projectId);
      setSaveState("updated");
      window.setTimeout(() => setSaveState("idle"), 2000);
    });
  }, [
    mode,
    pricing,
    calculated,
    quantity,
    unit,
    projectId,
    onError,
  ]);

  const persistPricing = useCallback(
    (options?: { silent?: boolean }) => {
      const pricingMethod = pricingMethodForMode(mode);
      if (!pricingMethod) {
        return;
      }

      if (mode !== "package" && liveNumbers.sell_rate <= 0 && mode !== "quote") {
        if (mode === "manual" || mode === "allowance") {
          // Allow saving zero for in-progress manual/allowance only when explicitly cleared
        }
      }

      setSaveState("saving");
      setSaveError(null);

      startTransition(async () => {
        const payload = {
          pricing_method: pricingMethod,
          quantity,
          unit,
          cost_rate: liveNumbers.cost_rate,
          sell_rate: liveNumbers.sell_rate,
          sell_rate_overridden: liveNumbers.sell_rate_overridden,
          margin_percentage: liveNumbers.margin_percentage,
          markup_percentage: null as number | null,
          notes: pricing?.notes ?? null,
        };

        const result = pricing?.id
          ? await updatePricingItemAction(pricing.id, projectId, payload)
          : await createPricingItemAction(projectId, {
              takeoff_item_id: takeoffItem.id,
              ...payload,
            });

        if (result.error) {
          setSaveState("error");
          setSaveError(result.error);
          onError(result.error);
          return;
        }

        dispatchEstimateUpdated(projectId);
        onPricingSaved();
        if (!options?.silent) {
          setSaveState("saved");
          window.setTimeout(() => setSaveState("idle"), 2000);
        } else {
          setSaveState("idle");
        }
      });
    },
    [
      mode,
      liveNumbers,
      quantity,
      unit,
      pricing,
      projectId,
      takeoffItem.id,
      onPricingSaved,
      onError,
    ]
  );

  useEffect(() => {
    if (pricing) {
      return;
    }
    if (mode !== "quote" && mode !== "allowance") {
      return;
    }

    const key = `${takeoffItem.id}:${mode}`;
    if (ensuredMethodRef.current === key) {
      return;
    }
    ensuredMethodRef.current = key;

    const pricingMethod = pricingMethodForMode(mode);
    if (!pricingMethod) {
      return;
    }

    startTransition(async () => {
      const result = await createPricingItemAction(projectId, {
        takeoff_item_id: takeoffItem.id,
        pricing_method: pricingMethod,
        quantity,
        unit,
        cost_rate: 0,
        sell_rate: 0,
        sell_rate_overridden: false,
      });

      if (result.error) {
        setSaveState("error");
        setSaveError(result.error);
        onError(result.error);
        return;
      }

      dispatchEstimateUpdated(projectId);
      onPricingSaved();
    });
  }, [
    mode,
    pricing,
    takeoffItem.id,
    projectId,
    quantity,
    unit,
    onPricingSaved,
    onError,
  ]);

  function handleFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      persistPricing();
    }
  }

  if (mode === "empty") {
    return (
      <section className={cn("space-y-2", className)}>
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pricing
        </h4>
        <p className="text-sm text-muted-foreground">
          Apply a package or choose a pricing method above.
        </p>
      </section>
    );
  }

  const marginDisplay = formatPercent(liveNumbers.margin_percentage);
  const marginNegative =
    liveNumbers.margin_percentage !== null && liveNumbers.margin_percentage < 0;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pricing
        </h4>
        <SaveIndicator
          state={saveState}
          isPending={isPending}
          error={saveError}
        />
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Method</dt>
          <dd className="font-medium">{methodLabelForMode(mode)}</dd>
        </div>
      </dl>

      {showPackageComponentsWarning && mode === "package" ? (
        <p
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-900"
          role="alert"
        >
          This package has no material or labour components. Add components in
          Templates, then re-apply the package.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <PricingField
          label={`Cost rate / ${unit}`}
          value={mode === "package" ? formatRateValue(derivedCostRate) : costRateInput}
          displayValue={
            mode === "package" ? formatCurrency(derivedCostRate) : undefined
          }
          readOnly={mode === "package"}
          onChange={(value) => {
            setLastEdited("cost_rate");
            setCostRateInput(value);
          }}
          onBlur={() => {
            if (mode !== "package") {
              persistPricing();
            }
          }}
          onKeyDown={handleFieldKeyDown}
        />
        <PricingField
          ref={
            mode === "package" || mode === "manual" || mode === "quote"
              ? sellRateRef
              : undefined
          }
          label={`Sell rate / ${unit}`}
          value={mode === "package" ? formatRateValue(calculated.sellRate) : sellRateInput}
          displayValue={
            mode === "package" ? formatCurrency(calculated.sellRate) : undefined
          }
          readOnly={mode === "package"}
          onChange={(value) => {
            setLastEdited("sell_rate");
            setSellRateInput(value);
          }}
          onBlur={() => {
            if (mode !== "package") {
              persistPricing();
            }
          }}
          onKeyDown={handleFieldKeyDown}
        />
        <PricingField
          label="Total cost"
          value={
            mode === "package"
              ? formatMoneyInput(liveNumbers.total_cost)
              : totalCostInput
          }
          displayValue={
            mode === "package" ? formatCurrency(liveNumbers.total_cost) : undefined
          }
          readOnly={mode === "package"}
          onChange={(value) => {
            setLastEdited("total_cost");
            setTotalCostInput(value);
          }}
          onBlur={() => {
            if (mode !== "package") {
              persistPricing();
            }
          }}
          onKeyDown={handleFieldKeyDown}
        />
        <PricingField
          label="Total sell"
          value={
            mode === "package" ? formatMoneyInput(liveNumbers.total_sell) : totalSellInput
          }
          displayValue={
            mode === "package" ? formatCurrency(liveNumbers.total_sell) : undefined
          }
          readOnly={mode === "package"}
          onChange={(value) => {
            setLastEdited("total_sell");
            setTotalSellInput(value);
          }}
          onBlur={() => {
            if (mode !== "package") {
              persistPricing();
            }
          }}
          onKeyDown={handleFieldKeyDown}
        />
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Gross profit</Label>
          <p className="font-mono text-sm tabular-nums">
            {formatCurrency(liveNumbers.gross_profit)}
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Margin</Label>
          <p
            className={cn(
              "font-mono text-sm tabular-nums",
              marginNegative && "text-red-800",
              !marginNegative &&
                liveNumbers.margin_percentage !== null &&
                "text-emerald-800"
            )}
          >
            {marginDisplay}
          </p>
        </div>
      </div>

      {mode === "quote" || mode === "allowance" || mode === "manual" ? (
        <p className="text-xs text-muted-foreground">
          Enter cost and sell values for this item.
          {mode === "quote"
            ? " Use cost rate for the quote amount and sell rate for your charge-out."
            : mode === "allowance"
              ? " Set cost to the allowance and sell to your charge-out value."
              : null}
        </p>
      ) : null}
    </section>
  );
}

const PricingField = forwardRef<
  HTMLInputElement,
  {
    label: string;
    value: string;
    readOnly?: boolean;
    displayValue?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  }
>(function PricingField(
  { label, value, readOnly = false, displayValue, onChange, onBlur, onKeyDown },
  ref
) {
  if (readOnly) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <p className="rounded-md border border-transparent bg-muted/30 px-2 py-1.5 font-mono text-sm tabular-nums">
          {displayValue ?? (value.trim() ? formatCurrency(Number.parseFloat(value) || 0) : "—")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        placeholder="0"
        className="h-8 border-input bg-background font-mono text-sm tabular-nums"
        onChange={(event) => onChange?.(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  );
});

function SaveIndicator({
  state,
  isPending,
  error,
}: {
  state: SaveState;
  isPending: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <span className="text-xs text-destructive" role="alert">
        {error}
      </span>
    );
  }
  if (isPending || state === "saving") {
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  }
  if (state === "saved") {
    return <span className="text-xs text-emerald-700">Saved</span>;
  }
  if (state === "updated") {
    return <span className="text-xs text-emerald-700">Updated</span>;
  }
  return null;
}
