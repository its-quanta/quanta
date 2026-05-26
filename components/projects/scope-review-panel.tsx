"use client";

import { useMemo, useState } from "react";

import { ApplyPackageDialog } from "@/components/takeoff/apply-package-dialog";
import {
  formatMetricPercent,
  WorkflowMetricCards,
} from "@/components/projects/workflow-metric-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ProjectLabourPanel } from "@/components/labour/project-labour-panel";
import { ProjectMaterialsPanel } from "@/components/materials/project-materials-panel";
import { ProjectPricingPanel } from "@/components/pricing/project-pricing-panel";
import {
  buildScopeReviewRows,
  computeScopeReviewSummary,
} from "@/src/lib/projects/scope-review";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  AssemblyPackage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  Standard,
  StandardLink,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";
import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

type ScopeReviewPanelProps = {
  projectId: string;
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItemWithTakeoff[];
  pricingItemsPlain: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  assemblyPackages: AssemblyPackage[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  standardLinks: StandardLink[];
  estimateLoadError: string | null;
  onNavigateTab: (tab: WorkspaceTabValue, takeoffId?: string) => void;
  pricingTakeoffId?: string | null;
  onPricingTakeoffConsumed?: () => void;
};

export function ScopeReviewPanel({
  projectId,
  takeoffItems,
  takeoffAssemblies,
  pricingItems,
  pricingItemsPlain,
  materialItems,
  labourItems,
  assemblyPackages,
  organisationStandards,
  projectStandardLinks,
  standardLinks,
  estimateLoadError,
  onNavigateTab,
  pricingTakeoffId,
  onPricingTakeoffConsumed,
}: ScopeReviewPanelProps) {
  const [applyPackageItem, setApplyPackageItem] = useState<TakeoffItem | null>(
    null
  );
  const [showBuildUp, setShowBuildUp] = useState<"materials" | "labour" | null>(
    null
  );

  const rows = useMemo(
    () =>
      buildScopeReviewRows({
        takeoffItems,
        takeoffAssemblies,
        pricingItems: pricingItemsPlain,
        materialItems,
        labourItems,
        standardLinks,
      }),
    [
      takeoffItems,
      takeoffAssemblies,
      pricingItemsPlain,
      materialItems,
      labourItems,
      standardLinks,
    ]
  );

  const summary = useMemo(() => computeScopeReviewSummary(rows), [rows]);

  const takeoffById = useMemo(
    () => new Map(takeoffItems.map((item) => [item.id, item] as const)),
    [takeoffItems]
  );

  const issueRows = rows.filter((row) => row.issues.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <WorkflowMetricCards
        columns={4}
        metrics={[
          {
            label: "Package coverage",
            value: formatMetricPercent(summary.packageCoveragePercent),
          },
          {
            label: "Pricing coverage",
            value: formatMetricPercent(summary.pricingCoveragePercent),
          },
          {
            label: "Missing pricing",
            value: String(summary.missingPricing),
            accent:
              summary.missingPricing > 0 ? "text-amber-800" : undefined,
          },
          {
            label: "Missing methodology",
            value: String(summary.missingMethodology),
            accent:
              summary.missingMethodology > 0 ? "text-amber-800" : undefined,
          },
          {
            label: "Missing labour",
            value: String(summary.missingLabour),
          },
          {
            label: "Missing materials",
            value: String(summary.missingMaterials),
          },
          {
            label: "Missing drawing ref",
            value: String(summary.missingDrawingRef),
          },
          {
            label: "Missing standards",
            value: String(summary.missingStandards),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope intelligence</CardTitle>
          <CardDescription>
            Review takeoff lines, generation status, and issues before commercial
            sign-off.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Takeoff item</TableHead>
                <TableHead scope="col">Trade</TableHead>
                <TableHead scope="col">Package</TableHead>
                <TableHead scope="col">Pricing</TableHead>
                <TableHead scope="col">Materials</TableHead>
                <TableHead scope="col">Labour</TableHead>
                <TableHead scope="col">Standards</TableHead>
                <TableHead scope="col">Drawing ref</TableHead>
                <TableHead scope="col">Issues</TableHead>
                <TableHead scope="col" className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issueRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground">
                    No outstanding issues on priceable takeoff lines.
                  </TableCell>
                </TableRow>
              ) : (
                issueRows.map((row) => {
                  const takeoff = takeoffById.get(row.takeoffItemId);
                  return (
                    <TableRow key={row.takeoffItemId}>
                      <TableCell className="font-medium">
                        {row.itemName}
                      </TableCell>
                      <TableCell>{row.trade}</TableCell>
                      <TableCell className="text-sm">
                        {row.packageName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            row.pricingStatus === "Priced"
                              ? "text-emerald-800"
                              : "text-amber-900"
                          }
                        >
                          {row.pricingStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.materialsGenerated ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>{row.labourGenerated ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {row.standardsLinked ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.drawingRef ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ul className="flex flex-col gap-0.5">
                          {row.issues.map((issue) => (
                            <li
                              key={issue}
                              className="text-xs text-amber-900"
                            >
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {!row.packageName && takeoff ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setApplyPackageItem(takeoff)}
                            >
                              Apply methodology
                            </Button>
                          ) : null}
                          {row.pricingStatus === "Unpriced" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onNavigateTab(
                                  "commercial-review",
                                  row.takeoffItemId
                                )
                              }
                            >
                              Open pricing
                            </Button>
                          ) : null}
                          {!row.standardsLinked ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigateTab("tender-inputs")}
                            >
                              Link standard
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={showBuildUp === "materials" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setShowBuildUp((current) =>
              current === "materials" ? null : "materials"
            )
          }
        >
          Materials build-up
        </Button>
        <Button
          type="button"
          variant={showBuildUp === "labour" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setShowBuildUp((current) => (current === "labour" ? null : "labour"))
          }
        >
          Labour build-up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigateTab("commercial-review")}
        >
          Open pricing workspace
        </Button>
      </div>

      {showBuildUp === "materials" ? (
        <ProjectMaterialsPanel
          projectId={projectId}
          materialItems={materialItems}
          takeoffAssemblies={takeoffAssemblies}
          estimateLoadError={estimateLoadError}
        />
      ) : null}

      {showBuildUp === "labour" ? (
        <ProjectLabourPanel
          projectId={projectId}
          labourItems={labourItems}
          takeoffAssemblies={takeoffAssemblies}
          estimateLoadError={estimateLoadError}
        />
      ) : null}

      {pricingTakeoffId ? (
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
      ) : null}

      <ApplyPackageDialog
        projectId={projectId}
        takeoffItem={applyPackageItem}
        existingAssembly={
          applyPackageItem
            ? takeoffAssemblies.find(
                (row) => row.takeoff_item_id === applyPackageItem.id
              ) ?? null
            : null
        }
        assemblyPackages={assemblyPackages}
        existingPricing={
          applyPackageItem
            ? pricingItemsPlain.find(
                (row) => row.takeoff_item_id === applyPackageItem.id
              ) ?? null
            : null
        }
        open={applyPackageItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApplyPackageItem(null);
          }
        }}
      />
    </div>
  );
}
