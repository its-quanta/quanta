"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AssumptionsPanel } from "@/components/submission/assumptions-panel";
import { ExclusionsPanel } from "@/components/submission/exclusions-panel";
import { RfisPanel } from "@/components/submission/rfis-panel";
import { SubmissionBlockersColumns } from "@/components/submission/submission-blockers-columns";
import { TenderPackPreviewModal } from "@/components/submission/tender-pack-preview-modal";
import { SubmissionReadinessSummary } from "@/components/submission/submission-readiness-summary";
import { SubmissionStickyStatus } from "@/components/submission/submission-sticky-status";
import { SubmissionTenderPackPanel } from "@/components/submission/submission-tender-pack-panel";
import { SubmissionValidationAccordion } from "@/components/submission/submission-validation-accordion";
import { useOrganisationSettings } from "@/components/layout/organisation-settings-provider";
import { buildSubmissionPreview } from "@/src/lib/submission/preview";
import { buildTenderPackPreview } from "@/src/lib/submission/tender-pack-preview";
import { validateTender } from "@/src/lib/submission/validate-tender";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  ClarificationTemplate,
  Document,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLink,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

type SubmissionPanelProps = {
  project: Project;
  projectId: string;
  documents: Document[];
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItemWithTakeoff[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  standardLinks: StandardLink[];
  clarifications: TenderClarification[];
  templates: ClarificationTemplate[];
};

export function SubmissionPanel({
  project,
  projectId,
  documents,
  takeoffItems,
  pricingItems,
  takeoffAssemblies,
  materialItems,
  labourItems,
  standardLinks,
  clarifications,
  templates,
}: SubmissionPanelProps) {
  const { settings, currency } = useOrganisationSettings();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const issuesRef = useRef<HTMLDivElement>(null);
  const exclusionsRef = useRef<HTMLDivElement>(null);
  const assumptionsRef = useRef<HTMLDivElement>(null);
  const rfisRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewGeneratedAt, setPreviewGeneratedAt] = useState<string | null>(
    null
  );

  const priceableTakeoff = useMemo(
    () => takeoffItems.filter((item) => item.status !== "excluded"),
    [takeoffItems]
  );

  const validation = useMemo(
    () =>
      validateTender({
        documents,
        takeoffItems,
        pricingItems,
        takeoffAssemblies,
        materialItems,
        labourItems,
        standardLinks,
        clarifications,
        organisationSettings: settings,
      }),
    [
      documents,
      takeoffItems,
      pricingItems,
      takeoffAssemblies,
      materialItems,
      labourItems,
      standardLinks,
      clarifications,
      settings,
    ]
  );

  const packContents = useMemo(
    () =>
      buildSubmissionPreview({
        documents,
        takeoffItems,
        pricingItems,
        materialItems,
        labourItems,
        clarifications,
      }),
    [documents, takeoffItems, pricingItems, materialItems, labourItems, clarifications]
  );

  const tenderPackPreview = useMemo(
    () =>
      buildTenderPackPreview({
        project,
        organisationSettings: settings,
        documents,
        takeoffItems,
        pricingItems,
        takeoffAssemblies,
        materialItems,
        labourItems,
        clarifications,
        validation,
        packContents,
        generatedAt: previewGeneratedAt ?? new Date().toISOString(),
      }),
    [
      project,
      settings,
      documents,
      takeoffItems,
      pricingItems,
      takeoffAssemblies,
      materialItems,
      labourItems,
      clarifications,
      validation,
      packContents,
      previewGeneratedAt,
    ]
  );

  function openTenderPackPreview() {
    setPreviewGeneratedAt(new Date().toISOString());
    setPreviewOpen(true);
  }

  const critical = useMemo(
    () => validation.issues.filter((i) => i.severity === "critical"),
    [validation.issues]
  );
  const warnings = useMemo(
    () => validation.issues.filter((i) => i.severity === "warning"),
    [validation.issues]
  );

  const exclusions = clarifications.filter((row) => row.type === "exclusion");
  const assumptions = clarifications.filter((row) => row.type === "assumption");
  const rfis = clarifications.filter((row) => row.type === "rfi");

  function scrollToRef(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const target =
      sectionParam === "exclusions"
        ? exclusionsRef
        : sectionParam === "assumptions"
          ? assumptionsRef
          : sectionParam === "rfis"
            ? rfisRef
            : null;
    if (target?.current) {
      target.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sectionParam]);

  return (
    <div className="flex flex-col gap-5">
      <SubmissionReadinessSummary
        project={project}
        validation={validation}
        onFixIssues={() => scrollToRef(issuesRef)}
        onPreviewPack={openTenderPackPreview}
      />

      <div ref={issuesRef}>
        <SubmissionBlockersColumns
          projectId={projectId}
          critical={critical}
          warnings={warnings}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-12 xl:items-start">
        <div className="flex flex-col gap-5 xl:col-span-7">
          <div ref={exclusionsRef}>
            <ExclusionsPanel
              projectId={projectId}
              items={exclusions}
              templates={templates}
            />
          </div>

          <div ref={assumptionsRef}>
            <AssumptionsPanel
              projectId={projectId}
              items={assumptions}
              templates={templates}
            />
          </div>

          <div ref={rfisRef}>
            <RfisPanel
              projectId={projectId}
              items={rfis}
              takeoffItems={priceableTakeoff}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Validation details
            </p>
            <SubmissionValidationAccordion validation={validation} />
          </div>
        </div>

        <div className="flex flex-col gap-5 xl:col-span-5">
          <SubmissionTenderPackPanel
            preview={packContents}
            onPreviewPack={openTenderPackPreview}
          />
          <SubmissionStickyStatus
            validation={validation}
            onPreviewPack={openTenderPackPreview}
          />
        </div>
      </div>

      <TenderPackPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={tenderPackPreview}
        currency={currency}
      />
    </div>
  );
}
