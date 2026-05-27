"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProjectTakeoffPanel } from "@/components/takeoff/project-takeoff-panel";
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
  DocumentPage,
  PricingItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type TakeoffTabPanelProps = {
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

export function TakeoffTabPanel({
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
}: TakeoffTabPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
      <div>
        <h2 className="text-lg font-medium">Takeoff</h2>
        <p className="text-sm text-muted-foreground">
          Measure quantities, link drawings, and apply packages before build-up
          and commercial review.
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

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div>
          <h3 className="text-base font-medium">Linked standards</h3>
          <p className="text-sm text-muted-foreground">
            References attached from takeoff lines and packages on this tender.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standards on project</CardTitle>
            <CardDescription>
              {uniqueStandards.length === 0
                ? "No standards linked yet. Use Link standard on a takeoff line."
                : `${uniqueStandards.length} reference${uniqueStandards.length === 1 ? "" : "s"} on this tender.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uniqueStandards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Maintain your library under Organisation → Standards.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {uniqueStandards.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {link.standard.reference_code}
                      </p>
                      <p className="text-sm text-foreground">{link.standard.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {
                          STANDARD_TYPES.find(
                            (t) => t.value === link.standard.standard_type
                          )?.label
                        }
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
