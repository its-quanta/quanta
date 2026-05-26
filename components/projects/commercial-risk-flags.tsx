import { Badge } from "@/components/ui/badge";
import type { CommercialRiskFlag } from "@/src/lib/projects/commercial-metrics";

type CommercialRiskFlagsProps = {
  flags: CommercialRiskFlag[];
};

export function CommercialRiskFlags({ flags }: CommercialRiskFlagsProps) {
  if (flags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No commercial risk flags. Review margins and unpriced lines before
        submission.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {flags.map((flag) => (
        <li
          key={flag.id}
          className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
        >
          <Badge
            variant={flag.severity === "blocker" ? "destructive" : "outline"}
            className={
              flag.severity === "review"
                ? "shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-900"
                : "shrink-0"
            }
          >
            {flag.severity === "blocker" ? "Blocker" : "Review"}
          </Badge>
          <span className="text-foreground">{flag.label}</span>
        </li>
      ))}
    </ul>
  );
}
