"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SCOPE_TAKEOFF_READINESS_LABELS,
  type ScopeTakeoffReadiness,
} from "@/components/scope/scope-takeoff-readiness";

type ScopeTakeoffReadinessBadgeProps = {
  readiness: ScopeTakeoffReadiness;
  className?: string;
};

export function ScopeTakeoffReadinessBadge({
  readiness,
  className,
}: ScopeTakeoffReadinessBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 shrink-0 px-1.5 text-[10px] font-medium",
        readiness === "needs_package" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-900",
        readiness === "needs_pricing" &&
          "border-sky-500/40 bg-sky-500/10 text-sky-900",
        readiness === "ready" &&
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
        className
      )}
    >
      {SCOPE_TAKEOFF_READINESS_LABELS[readiness]}
    </Badge>
  );
}
