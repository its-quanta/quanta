import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatQuantity } from "@/src/lib/format";
import type { LabourSummaryTotals } from "@/src/lib/estimate-generation/summary";

type LabourSummaryCardsProps = {
  totals: LabourSummaryTotals;
};

export function LabourSummaryCards({ totals }: LabourSummaryCardsProps) {
  const cards = [
    {
      label: "Total labour hours",
      value: formatQuantity(totals.totalHours),
      accent: "",
    },
    {
      label: "Total labour cost",
      value: formatCurrency(totals.totalCost),
      accent: "",
    },
    {
      label: "Total labour sell",
      value: formatCurrency(totals.totalSell),
      accent: "text-primary",
    },
    {
      label: "Outstanding review",
      value: String(totals.outstandingReviewCount),
      accent:
        totals.outstandingReviewCount > 0 ? "text-amber-800" : "text-emerald-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
