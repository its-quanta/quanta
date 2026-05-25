import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AiTenderInsightsPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">AI Tender Insights</CardTitle>
        <p className="text-sm text-muted-foreground">
          Draft insights from takeoff, pricing, and clarifications — review before
          acting.
        </p>
      </CardHeader>
      <CardContent>
        {/* TODO: Surface AI tender insights when insight pipeline is wired (sources, confidence, verification). */}
        <div className="rounded-lg border border-dashed border-border bg-background/60 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Insights will appear here once the review pipeline is connected.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            No draft AI outputs shown until verified workflow is live.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
