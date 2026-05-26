import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TenderValidationAction } from "@/src/lib/submission/types";

type SubmissionActionsSectionProps = {
  projectId: string;
  actions: TenderValidationAction[];
};

function buildActionHref(
  projectId: string,
  action: TenderValidationAction
): string {
  const params = new URLSearchParams();
  params.set("tab", action.tab);
  if (action.priceTakeoff) {
    params.set("priceTakeoff", action.priceTakeoff);
  }
  if (action.section) {
    params.set("section", action.section);
  }
  return `/projects/${projectId}?${params.toString()}`;
}

export function SubmissionActionsSection({
  projectId,
  actions,
}: SubmissionActionsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recommended actions</CardTitle>
        <CardDescription>
          Resolve blockers with the fewest clicks — deep links into the workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outstanding actions. Review validation checks before issuing the
            tender.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button key={action.id} variant="outline" size="sm" asChild>
                <Link href={buildActionHref(projectId, action)}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
