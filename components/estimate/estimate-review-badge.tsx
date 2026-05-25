import { Badge } from "@/components/ui/badge";

export function EstimateReviewBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-800">
        Reviewed
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-amber-500/50 bg-amber-500/10 text-amber-900"
    >
      Needs review
    </Badge>
  );
}
