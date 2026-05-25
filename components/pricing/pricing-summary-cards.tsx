import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import type { PricingSummaryTotals } from "@/src/lib/pricing/summary";

type PricingSummaryCardsProps = {
  totals: PricingSummaryTotals;
};

export function PricingSummaryCards({ totals }: PricingSummaryCardsProps) {
  const cards = [
    {
      label: "Total cost",
      value: formatCurrency(totals.totalCost),
      accent: "",
    },
    {
      label: "Total sell",
      value: formatCurrency(totals.totalSell),
      accent: "text-primary",
    },
    {
      label: "Gross profit",
      value: formatCurrency(totals.grossProfit),
      accent: "text-emerald-700",
    },
    {
      label: "Average margin %",
      value: formatPercent(totals.averageMarginPercent),
      accent: "",
    },
    {
      label: "Unpriced takeoff items",
      value: String(totals.unpricedCount),
      accent: totals.unpricedCount > 0 ? "text-amber-800" : "",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
