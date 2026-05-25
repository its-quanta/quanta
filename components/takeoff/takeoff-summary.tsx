import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeTakeoffTotals } from "@/src/lib/takeoff/constants";
import type { TakeoffItem } from "@/src/types/database";

type TakeoffSummaryProps = {
  items: TakeoffItem[];
};

export function TakeoffSummary({ items }: TakeoffSummaryProps) {
  const { totalItems, itemsReviewed, itemsOutstanding } =
    computeTakeoffTotals(items);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card size="sm">
        <CardHeader>
          <CardDescription>Total items</CardDescription>
          <CardTitle className="font-mono text-2xl tabular-nums">
            {totalItems}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>Items reviewed</CardDescription>
          <CardTitle className="font-mono text-2xl tabular-nums text-emerald-700 dark:text-emerald-400">
            {itemsReviewed}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>Items outstanding</CardDescription>
          <CardTitle className="font-mono text-2xl tabular-nums text-amber-800 dark:text-amber-400">
            {itemsOutstanding}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
