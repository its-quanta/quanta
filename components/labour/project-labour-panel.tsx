"use client";

import { useMemo } from "react";

import { GenerationSourceBanner } from "@/components/estimate/generation-source-banner";
import { LabourSummaryCards } from "@/components/labour/labour-summary-cards";
import { ProjectLabourTable } from "@/components/labour/project-labour-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  computeLabourSummary,
  getGenerationSources,
} from "@/src/lib/estimate-generation/summary";
import type {
  ProjectLabourItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ProjectLabourPanelProps = {
  projectId: string;
  labourItems: ProjectLabourItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  estimateLoadError: string | null;
};

export function ProjectLabourPanel({
  projectId,
  labourItems,
  takeoffAssemblies,
  estimateLoadError,
}: ProjectLabourPanelProps) {
  const summary = useMemo(
    () => computeLabourSummary(labourItems),
    [labourItems]
  );

  const generationSources = useMemo(
    () => getGenerationSources(takeoffAssemblies),
    [takeoffAssemblies]
  );

  const hasAppliedPackages = takeoffAssemblies.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <LabourSummaryCards totals={summary} />

      {estimateLoadError ? (
        <p className="text-sm text-destructive" role="alert">
          {estimateLoadError}
        </p>
      ) : null}

      <GenerationSourceBanner sources={generationSources} />

      {hasAppliedPackages && labourItems.length === 0 && !estimateLoadError ? (
        <p className="text-sm text-amber-900 dark:text-amber-200" role="status">
          A package is applied on takeoff, but no labour lines were generated.
          Confirm the package includes labour components, then re-apply the
          package on the takeoff line.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project labour</CardTitle>
          <CardDescription>
            Labour hours generated from assembly packages. Review each line
            before finalising your estimate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectLabourTable projectId={projectId} items={labourItems} />
        </CardContent>
      </Card>
    </div>
  );
}
