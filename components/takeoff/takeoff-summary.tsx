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
  const {
    totalItems,
    reviewedItems,
    outstandingItems,
    pricedItems,
    excludedItems,
  } = computeTakeoffTotals(items);

  const cards: { label: string; value: number; accent?: string }[] = [
    { label: "Total items", value: totalItems },
    { label: "Reviewed items", value: reviewedItems, accent: "text-emerald-700" },
    {
      label: "Outstanding items",
      value: outstandingItems,
      accent: "text-amber-800",
    },
    { label: "Priced items", value: pricedItems, accent: "text-primary" },
    {
      label: "Excluded items",
      value: excludedItems,
      accent: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle
              className={`font-mono text-2xl tabular-nums ${card.accent ?? ""}`}
            >
              {card.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
