import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/src/lib/format";
import type { MaterialsSummaryTotals } from "@/src/lib/estimate-generation/summary";

type MaterialsSummaryCardsProps = {
  totals: MaterialsSummaryTotals;
};

export function MaterialsSummaryCards({ totals }: MaterialsSummaryCardsProps) {
  const cards = [
    {
      label: "Total material cost",
      value: formatCurrency(totals.totalCost),
      accent: "",
    },
    {
      label: "Material lines",
      value: String(totals.itemCount),
      accent: "",
    },
    {
      label: "Outstanding review",
      value: String(totals.outstandingReviewCount),
      accent:
        totals.outstandingReviewCount > 0 ? "text-amber-800" : "text-emerald-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle
              className={`font-mono text-2xl tabular-nums ${card.accent}`}
            >
              {card.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
