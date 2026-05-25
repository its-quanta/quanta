"use client";

import { useMemo } from "react";

import { GenerationSourceBanner } from "@/components/estimate/generation-source-banner";
import { MaterialsSummaryCards } from "@/components/materials/materials-summary-cards";
import { ProjectMaterialsTable } from "@/components/materials/project-materials-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  computeMaterialsSummary,
  getGenerationSources,
} from "@/src/lib/estimate-generation/summary";
import type {
  ProjectMaterialItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ProjectMaterialsPanelProps = {
  projectId: string;
  materialItems: ProjectMaterialItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  estimateLoadError: string | null;
};

export function ProjectMaterialsPanel({
  projectId,
  materialItems,
  takeoffAssemblies,
  estimateLoadError,
}: ProjectMaterialsPanelProps) {
  const summary = useMemo(
    () => computeMaterialsSummary(materialItems),
    [materialItems]
  );

  const generationSources = useMemo(
    () => getGenerationSources(takeoffAssemblies),
    [takeoffAssemblies]
  );

  const hasAppliedPackages = takeoffAssemblies.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <MaterialsSummaryCards totals={summary} />

      {estimateLoadError ? (
        <p className="text-sm text-destructive" role="alert">
          {estimateLoadError}
        </p>
      ) : null}

      <GenerationSourceBanner sources={generationSources} />

      {hasAppliedPackages && materialItems.length === 0 && !estimateLoadError ? (
        <p className="text-sm text-amber-900 dark:text-amber-200" role="status">
          A package is applied on takeoff, but no material lines were generated.
          Confirm the package includes material components, then re-apply the
          package on the takeoff line.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project materials</CardTitle>
          <CardDescription>
            Material quantities generated from assembly packages. Review each
            line before finalising your estimate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectMaterialsTable projectId={projectId} items={materialItems} />
        </CardContent>
      </Card>
    </div>
  );
}
