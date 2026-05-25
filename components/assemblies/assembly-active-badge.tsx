import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AssemblyActiveBadge({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
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
