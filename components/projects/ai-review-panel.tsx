"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AiReviewCanvas } from "@/components/ai-review/ai-review-canvas";
import { AiReviewTable } from "@/components/ai-review/ai-review-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAiReviewItemsForProjectAction } from "@/src/lib/ai-review/actions";
import type {
  AiReviewItem,
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type AiReviewPanelProps = {
  projectId: string;
  items: AiReviewItem[];
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  pricingItems: PricingItem[];
};

export function AiReviewPanel({
  projectId,
  items: initialItems,
  documents,
  documentPages,
  takeoffItems,
  takeoffAssemblies,
  assemblyPackages,
  materialItems,
  labourItems,
  pricingItems,
}: AiReviewPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const reloadItems = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetchAiReviewItemsForProjectAction(projectId);
      setItems(response.items);

      if (response.error) {
        setFetchError(response.error);
      }

      console.info("[ai_review_items] panel_loaded", response.meta);
    } catch {
      setFetchError("Could not load AI suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    void reloadItems();
  }, [reloadItems]);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (detail?.projectId && detail.projectId !== projectId) {
        return;
      }
      void reloadItems();
    };

    window.addEventListener("quanta:ai-review-updated", handleUpdated);
    return () => {
      window.removeEventListener("quanta:ai-review-updated", handleUpdated);
    };
  }, [projectId, reloadItems]);

  const pendingCount = items.filter(
    (item) => item.status === "pending" || item.status === "adjusted"
  ).length;

  const handleRefresh = () => {
    void reloadItems();
    router.refresh();
  };

  if (items.length === 0 && !isLoading && !fetchError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">AI review</h2>
            <p className="text-sm text-muted-foreground">
              AI suggestions will appear here after document analysis is run.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              Review
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            No AI suggestions to review
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Run analysis on your documents to generate draft suggestions. Quanta
            never adds lines to your live estimate until you approve them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">AI review</h2>
          <p className="text-sm text-muted-foreground">
            Review AI suggestions before they enter your live takeoff. Accept,
            adjust, or reject each line.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Badge variant="outline" className="shrink-0 text-muted-foreground">
            {pendingCount} pending · {items.length} total
          </Badge>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      ) : null}

      {isLoading && items.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          Loading AI suggestions…
        </div>
      ) : (
        <>
          <AiReviewTable
            projectId={projectId}
            items={items}
            documents={documents}
            documentPages={documentPages}
          />

          <AiReviewCanvas
            projectId={projectId}
            items={items}
            documents={documents}
            documentPages={documentPages}
            takeoffItems={takeoffItems}
            takeoffAssemblies={takeoffAssemblies}
            assemblyPackages={assemblyPackages}
            materialItems={materialItems}
            labourItems={labourItems}
            pricingItems={pricingItems}
          />
        </>
      )}
    </div>
  );
}
