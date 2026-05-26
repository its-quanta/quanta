"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProjectDocumentsPanel } from "@/components/documents/project-documents-panel";
import { ProjectTakeoffPanel } from "@/components/takeoff/project-takeoff-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { unlinkStandardAction } from "@/src/lib/standards/actions";
import { STANDARD_TYPES } from "@/src/lib/standards/constants";
import type {
  AssemblyPackage,
  Document,
  DocumentClassification,
  DocumentPage,
  PricingItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

const DOCUMENT_GROUPS: {
  label: string;
  classifications: DocumentClassification[];
}[] = [
  {
    label: "Architectural",
    classifications: ["architectural_drawings"],
  },
  {
    label: "Structural",
    classifications: ["structural_drawings"],
  },
  {
    label: "Specification",
    classifications: ["specification", "scope_document"],
  },
  {
    label: "Schedules",
    classifications: ["schedule"],
  },
  {
    label: "Photos",
    classifications: ["photos_images"],
  },
  {
    label: "Other",
    classifications: ["other"],
  },
];

type TenderInputsPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  assemblyPackages: AssemblyPackage[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  onPriceManual?: (takeoffItemId: string) => void;
};

export function TenderInputsPanel({
  projectId,
  documents,
  documentPages,
  takeoffItems,
  assemblyPackages,
  takeoffAssemblies,
  pricingItems,
  organisationStandards,
  projectStandardLinks,
  onPriceManual,
}: TenderInputsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const documentsByGroup = useMemo(() => {
    return DOCUMENT_GROUPS.map((group) => {
      const groupDocs = documents.filter((doc) =>
        group.classifications.includes(doc.document_type)
      );
      return { ...group, documents: groupDocs, count: groupDocs.length };
    });
  }, [documents]);

  const uniqueStandards = useMemo(() => {
    const seen = new Set<string>();
    return projectStandardLinks.filter((link) => {
      if (seen.has(link.standard_id)) {
        return false;
      }
      seen.add(link.standard_id);
      return true;
    });
  }, [projectStandardLinks]);

  function handleUnlink(linkId: string) {
    startTransition(async () => {
      await unlinkStandardAction(linkId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Tender intake — upload and classify drawings, specs, and schedules.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documentsByGroup.map((group) => (
            <Card key={group.label} size="sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{group.label}</CardTitle>
                  {group.count === 0 ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/50 text-amber-900"
                    >
                      Missing
                    </Badge>
                  ) : (
                    <Badge variant="outline">{group.count}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {group.documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No {group.label.toLowerCase()} documents uploaded.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 text-xs">
                    {group.documents.slice(0, 4).map((doc) => (
                      <li key={doc.id} className="truncate text-foreground">
                        {doc.file_name}
                      </li>
                    ))}
                    {group.documents.length > 4 ? (
                      <li className="text-muted-foreground">
                        +{group.documents.length - 4} more
                      </li>
                    ) : null}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <ProjectDocumentsPanel projectId={projectId} documents={documents} />
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div>
          <h2 className="text-lg font-medium">Takeoff</h2>
          <p className="text-sm text-muted-foreground">
            Build quantities and apply workflow filters before scope review.
          </p>
        </div>
        <ProjectTakeoffPanel
          projectId={projectId}
          items={takeoffItems}
          documents={documents}
          documentPages={documentPages}
          assemblyPackages={assemblyPackages}
          takeoffAssemblies={takeoffAssemblies}
          pricingItems={pricingItems}
          organisationStandards={organisationStandards}
          projectStandardLinks={projectStandardLinks}
          onPriceManual={onPriceManual}
          showWorkflowFilter
          compact
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div>
          <h2 className="text-lg font-medium">References</h2>
          <p className="text-sm text-muted-foreground">
            Standards linked on this project (from takeoff lines and packages).
            Link or remove from takeoff row actions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked standards</CardTitle>
            <CardDescription>
              {uniqueStandards.length === 0
                ? "No standards linked yet. Use Link standard on a takeoff line."
                : `${uniqueStandards.length} reference${uniqueStandards.length === 1 ? "" : "s"} on this tender.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uniqueStandards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Examples: NZS 3604, GIB Guide, manufacturer specs — maintain your
                library under Organisation → Standards.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {uniqueStandards.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium font-mono">
                        {link.standard.reference_code}
                      </p>
                      <p className="text-sm text-foreground">
                        {link.standard.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {
                          STANDARD_TYPES.find(
                            (t) => t.value === link.standard.standard_type
                          )?.label
                        }
                        {link.entity_type === "takeoff_item"
                          ? " · Takeoff line"
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleUnlink(link.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
