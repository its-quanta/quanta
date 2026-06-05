"use client";

import { cn } from "@/lib/utils";
import { getPackageColumnDisplay } from "@/src/lib/estimate/package-display";
import type {
  AssemblyPackage,
  PricingItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type EstimatePackageColumnCellProps = {
  assembly: TakeoffItemAssemblyWithPackage | undefined;
  appliedPackage: AssemblyPackage | null;
  pricing: PricingItem | undefined;
  className?: string;
};

export function EstimatePackageColumnCell({
  assembly,
  appliedPackage,
  pricing,
  className,
}: EstimatePackageColumnCellProps) {
  const display = getPackageColumnDisplay({
    assembly,
    appliedPackage,
    pricing,
  });

  if (display.kind === "applied") {
    return (
      <div
        className={cn(
          "min-w-0 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-1.5 py-1",
          className
        )}
      >
        <p className="flex min-w-0 items-start gap-1 text-xs font-medium leading-snug text-emerald-900">
          <span className="shrink-0 text-emerald-700" aria-hidden>
            ✓
          </span>
          <span className="line-clamp-2">{display.label}</span>
        </p>
        {display.rateLabel ? (
          <p className="mt-0.5 pl-4 font-mono text-[10px] tabular-nums text-muted-foreground">
            {display.rateLabel}
          </p>
        ) : null}
      </div>
    );
  }

  if (display.kind === "none") {
    return (
      <span
        className={cn(
          "inline-flex rounded-md border border-slate-500/25 bg-slate-500/5 px-1.5 py-0.5 text-xs font-medium text-slate-600",
          className
        )}
      >
        {display.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-1.5 py-0.5 text-xs font-medium",
        display.kind === "quote" &&
          "border-blue-500/30 bg-blue-500/10 text-blue-800",
        display.kind === "allowance" &&
          "border-violet-500/30 bg-violet-500/10 text-violet-800",
        display.kind === "manual" &&
          "border-slate-500/30 bg-slate-500/10 text-slate-700",
        className
      )}
    >
      {display.label}
    </span>
  );
}
