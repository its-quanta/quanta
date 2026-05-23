import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TenderInsight } from "@/src/lib/dashboard/stats";

type TenderInsightCardsProps = {
  insights: TenderInsight[];
};

export function TenderInsightCards({ insights }: TenderInsightCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => (
        <Card key={insight.title} size="sm">
          <CardHeader className="gap-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {insight.count > 0 ? insight.count : "—"}
              </span>
            </div>
            <CardDescription>{insight.description}</CardDescription>
            <p className="text-xs text-muted-foreground">
              {insight.count > 0
                ? `${insight.count} item${insight.count === 1 ? "" : "s"} need attention`
                : insight.emptyMessage}
            </p>
            {insight.href ? (
              <Link
                href={insight.href}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                View projects
              </Link>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
