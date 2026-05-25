import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/src/lib/format";
import {
  OUTDATED_SUPPLIER_RATE_DAYS,
  RECENT_RATE_CHANGE_DAYS,
} from "@/src/lib/rates/constants";
import type { RateTabValue } from "@/components/rates/rates-workspace";
import type { RateLibrarySummary } from "@/src/lib/rates/queries";

type RateDashboardPanelProps = {
  summary: RateLibrarySummary;
};

const KIND_TAB: Record<
  RateLibrarySummary["recentChanges"][number]["kind"],
  string
> = {
  labour: "labour",
  material: "material",
  supplier: "supplier",
  subcontractor: "subcontractor",
};

export function RateDashboardPanel({ summary }: RateDashboardPanelProps) {
  const cards: {
    label: string;
    value: string;
    hint: string;
    tab: RateTabValue;
    warn?: boolean;
  }[] = [
    {
      label: "Labour rates",
      value: String(summary.labourCount),
      hint: "Roles and charge rates in your library",
      tab: "labour",
    },
    {
      label: "Material rates",
      value: String(summary.materialCount),
      hint: "Standard material cost rates",
      tab: "material",
    },
    {
      label: "Supplier rates",
      value: String(summary.supplierCount),
      hint: "Supplier price list entries",
      tab: "supplier",
    },
    {
      label: "Outdated rates",
      value: String(summary.outdatedSupplierCount),
      hint: `Supplier rates with no update in ${OUTDATED_SUPPLIER_RATE_DAYS}+ days`,
      tab: "supplier",
      warn: summary.outdatedSupplierCount > 0,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p
                className={
                  card.warn
                    ? "font-mono text-2xl font-semibold tabular-nums text-amber-600"
                    : "font-mono text-2xl font-semibold tabular-nums text-foreground"
                }
              >
                {card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              <Link
                href={`/rates?tab=${card.tab}`}
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                View {card.label.toLowerCase()}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent changes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rates updated in the last {RECENT_RATE_CHANGE_DAYS} days across your
            libraries.
          </p>
        </CardHeader>
        <CardContent>
          {summary.recentChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rate changes in the last {RECENT_RATE_CHANGE_DAYS} days.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.recentChanges.map((change) => (
                <li
                  key={`${change.kind}-${change.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {change.label}
                    </p>
                    {change.detail ? (
                      <p className="text-xs text-muted-foreground">
                        {change.detail}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {KIND_TAB[change.kind]}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatDate(change.updated_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
