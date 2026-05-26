"use client";

import { useMemo } from "react";

import { CommercialCostComposition } from "@/components/projects/commercial-cost-composition";
import { CommercialRiskFlags } from "@/components/projects/commercial-risk-flags";
import { MetricBarChart } from "@/components/projects/metric-bar-chart";
import {
  formatMetricPercent,
  WorkflowMetricCards,
} from "@/components/projects/workflow-metric-cards";
import { ProjectPricingPanel } from "@/components/pricing/project-pricing-panel";
import { useOrganisationSettings } from "@/components/layout/organisation-settings-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeCommercialMetrics } from "@/src/lib/projects/commercial-metrics";
import { formatCurrency, formatPercent, formatQuantity } from "@/src/lib/format";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  AssemblyPackage,
  PricingItem,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type CommercialReviewPanelProps = {
  project: Project;
  projectId: string;
  pricingItems: PricingItemWithTakeoff[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  pricingItemsPlain: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  scopeGapsTotal: number;
  exclusionsDraftedPercent: number | null;
  pricingTakeoffId?: string | null;
  onPricingTakeoffConsumed?: () => void;
};

function riskBadgeVariant(
  risk: "Low" | "Review" | "High"
): "outline" | "secondary" | "destructive" {
  if (risk === "High") {
    return "destructive";
  }
  if (risk === "Review") {
    return "secondary";
  }
  return "outline";
}

function riskBadgeClass(risk: "Low" | "Review" | "High"): string {
  if (risk === "Review") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-900";
  }
  return "";
}

export function CommercialReviewPanel({
  project,
  projectId,
  pricingItems,
  takeoffItems,
  takeoffAssemblies,
  assemblyPackages,
  pricingItemsPlain,
  materialItems,
  labourItems,
  organisationStandards,
  projectStandardLinks,
  scopeGapsTotal,
  exclusionsDraftedPercent,
  pricingTakeoffId,
  onPricingTakeoffConsumed,
}: CommercialReviewPanelProps) {
  const { settings, currency } = useOrganisationSettings();

  const metrics = useMemo(
    () =>
      computeCommercialMetrics({
        project,
        organisationSettings: settings,
        pricingItems,
        takeoffItems,
        takeoffAssemblies,
        materialItems,
        labourItems,
        scopeGapsTotal,
        exclusionsDraftedPercent,
      }),
    [
      project,
      settings,
      pricingItems,
      takeoffItems,
      takeoffAssemblies,
      materialItems,
      labourItems,
      scopeGapsTotal,
      exclusionsDraftedPercent,
    ]
  );

  const formatMoney = (value: number | null | undefined) =>
    formatCurrency(value, currency);

  const sourceRows = [
    { label: "Assembly package", value: metrics.pricingSourceBreakdown.packagePercent },
    { label: "Manual", value: metrics.pricingSourceBreakdown.manualPercent },
    {
      label: "Supplier quote",
      value: metrics.pricingSourceBreakdown.supplierQuotePercent,
    },
    { label: "Allowance", value: metrics.pricingSourceBreakdown.allowancePercent },
  ];

  return (
    <div className="flex flex-col gap-6">
      <WorkflowMetricCards
        columns={5}
        metrics={[
          { label: "Tender value", value: formatMoney(metrics.tenderValue) },
          { label: "Total cost", value: formatMoney(metrics.totalCost) },
          {
            label: "Gross profit",
            value: formatMoney(metrics.grossProfit),
            accent: "text-emerald-700",
          },
          {
            label: "Average margin %",
            value: formatMetricPercent(metrics.marginPercent),
          },
          {
            label: "Material %",
            value: formatMetricPercent(metrics.materialPercent),
          },
          {
            label: "Labour %",
            value: formatMetricPercent(metrics.labourPercent),
          },
          {
            label: "Package coverage",
            value: formatMetricPercent(metrics.packageCoveragePercent),
          },
          {
            label: "Manual pricing %",
            value: formatMetricPercent(metrics.manualPricingPercent),
          },
          {
            label: "Unpriced items",
            value: String(metrics.unpricedItems),
            accent: metrics.unpricedItems > 0 ? "text-amber-800" : undefined,
          },
          {
            label: "Risk score",
            value: metrics.riskScore,
            accent:
              metrics.riskScore === "High" || metrics.riskScore === "Overdue"
                ? "text-destructive"
                : undefined,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost composition</CardTitle>
            <CardDescription>
              Breakdown from materials, labour, and priced lines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommercialCostComposition
              composition={metrics.costComposition}
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing source</CardTitle>
            <CardDescription>Share of priced takeoff lines by source.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {sourceRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{row.label}</span>
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {formatMetricPercent(row.value)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Labour vs material</CardTitle>
            <CardDescription>
              Split from generated material and labour lines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Labour cost</dt>
                <dd className="font-mono tabular-nums">
                  {formatMoney(metrics.labourMaterialSplit.labourCost)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Material cost</dt>
                <dd className="font-mono tabular-nums">
                  {formatMoney(metrics.labourMaterialSplit.materialCost)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-3">
                <dt className="text-muted-foreground">Labour share</dt>
                <dd className="font-mono tabular-nums">
                  {formatMetricPercent(metrics.labourMaterialSplit.labourPercent)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Material share</dt>
                <dd className="font-mono tabular-nums">
                  {formatMetricPercent(
                    metrics.labourMaterialSplit.materialPercent
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin by trade</CardTitle>
            <CardDescription>Gross profit allocation across trades.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarChart
              title=""
              segments={metrics.marginByTrade}
              emptyMessage="Add priced lines to see margin by trade."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commercial risk flags</CardTitle>
            <CardDescription>
              Deterministic checks before submission — no AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommercialRiskFlags flags={metrics.riskFlags} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Package performance</CardTitle>
          <CardDescription>
            Cost, sell, and margin for each assembly package in use.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Package / assembly</TableHead>
                <TableHead scope="col" className="text-right">
                  Qty used
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Total cost
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Total sell
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Gross profit
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Margin %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.packagePerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Apply packages to takeoff lines to see performance.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.packagePerformance.map((row) => (
                  <TableRow key={row.packageId}>
                    <TableCell className="font-medium">
                      {row.packageName}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatQuantity(row.quantityUsed)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMoney(row.totalCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMoney(row.totalSell)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMoney(row.grossProfit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatPercent(row.marginPercent)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commercial by trade</CardTitle>
          <CardDescription>
            Coverage, margin, and risk from saved pricing lines.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Trade</TableHead>
                <TableHead scope="col" className="text-right">
                  Takeoff items
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Cost
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Sell
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Gross profit
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Margin %
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Package
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Pricing
                </TableHead>
                <TableHead scope="col">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.tradeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No takeoff trades yet.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.tradeRows.map((row) => (
                  <TableRow key={row.trade}>
                    <TableCell className="font-medium">{row.trade}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {row.takeoffItems}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMoney(row.cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMoney(row.sell)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMoney(row.grossProfit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatPercent(row.marginPercent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono tabular-nums">
                        {formatMetricPercent(row.packageCoveragePercent)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono tabular-nums">
                        {formatMetricPercent(row.pricingCoveragePercent)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={riskBadgeVariant(row.risk)}
                        className={riskBadgeClass(row.risk)}
                      >
                        {row.risk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="border-t border-border pt-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium">Pricing workspace</h2>
          <p className="text-sm text-muted-foreground">
            Build sell price, margins, and manual overrides on takeoff lines.
          </p>
        </div>
        <ProjectPricingPanel
          projectId={projectId}
          pricingItems={pricingItems}
          takeoffItems={takeoffItems}
          takeoffAssemblies={takeoffAssemblies}
          assemblyPackages={assemblyPackages}
          pricingItemsPlain={pricingItemsPlain}
          organisationStandards={organisationStandards}
          projectStandardLinks={projectStandardLinks}
          initialTakeoffItemId={pricingTakeoffId}
          onInitialTakeoffConsumed={onPricingTakeoffConsumed}
        />
      </section>
    </div>
  );
}
