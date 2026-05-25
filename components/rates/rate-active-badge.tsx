import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RateActiveBadgeProps = {
  isActive: boolean;
  className?: string;
};

export function RateActiveBadge({ isActive, className }: RateActiveBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        isActive
          ? "border-emerald-500/40 text-emerald-700"
          : "border-muted-foreground/30 text-muted-foreground",
        className
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
