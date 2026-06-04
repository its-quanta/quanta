"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EstimateItemStatus } from "@/src/lib/estimate/item-status";

const BADGE_CONFIG: Record<
  EstimateItemStatus,
  { label: string; className: string }
> = {
  no_package: {
    label: "○ No package",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  },
  no_sell_price: {
    label: "⚠ No sell price",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  },
  inverted: {
    label: "! Inverted",
    className: "border-red-500/30 bg-red-500/10 text-red-800",
  },
  quote: {
    label: "Q Quote",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-800",
  },
  allowance: {
    label: "A Allowance",
    className: "border-violet-500/30 bg-violet-500/10 text-violet-800",
  },
  manual_unsaved: {
    label: "M Manual",
    className: "border-slate-500/30 bg-slate-500/10 text-slate-700",
  },
  ready: {
    label: "✓ Ready",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
};

type EstimateStatusBadgeProps = {
  status: EstimateItemStatus;
  className?: string;
  onClick?: () => void;
};

export function EstimateStatusBadge({
  status,
  className,
  onClick,
}: EstimateStatusBadgeProps) {
  const config = BADGE_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full truncate font-normal",
        config.className,
        onClick && "cursor-pointer hover:opacity-90",
        className
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {config.label}
    </Badge>
  );
}
