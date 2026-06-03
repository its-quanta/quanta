"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AiReviewEvidenceDrawer } from "@/components/ai-review/ai-review-evidence-drawer";
import { DocumentAnalysisPanel } from "@/components/projects/document-analysis-panel";
import { ScopeDocumentRail } from "@/components/projects/scope/scope-document-rail";
import { ScopeDrawingPanel } from "@/components/projects/scope/scope-drawing-panel";
import { ScopeSuggestionsPanel } from "@/components/projects/scope/scope-suggestions-panel";
import { ScopeTakeoffPanel } from "@/components/projects/scope/scope-takeoff-panel";
import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchAiReviewItemsForProjectAction } from "@/src/lib/ai-review/actions";
import { isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import type {
  AiReviewItem,
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  Standard,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ScopeCentreMode = "discover" | "suggestions" | "takeoff";

type ScopeWorkspacePanelProps = {
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
  organisationStandards: Standard[];
  projectStandardLinks: StandardLinkWithStandard[];
  onPriceManual?: (takeoffItemId: string) => void;
};

const CENTRE_MODES: { id: ScopeCentreMode; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "suggestions", label: "Suggestions" },
  { id: "takeoff", label: "Takeoff" },
];

export function ScopeWorkspacePanel({
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
  organisationStandards,
  projectStandardLinks,
  onPriceManual,
}: ScopeWorkspacePanelProps) {
  const router = useRouter();
  const currency = useOrganisationCurrency();
  const [items, setItems] = useState(initialItems);
  const [centreMode, setCentreMode] = useState<ScopeCentreMode>("suggestions");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [evidenceItem, setEvidenceItem] = useState<AiReviewItem | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [showOverlayLayer, setShowOverlayLayer] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState<
    "medium" | "low" | null
  >(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supportedDocuments = useMemo(
    () =>
      documents.filter(
        (doc) =>
          isPdfMimeType(doc.file_type) || doc.file_type.startsWith("image/")
      ),
    [documents]
  );

  const defaultDocumentId = useMemo(() => {
    const firstPdf = supportedDocuments.find((doc) =>
      isPdfMimeType(doc.file_type)
    );
    return firstPdf?.id ?? supportedDocuments[0]?.id ?? null;
  }, [supportedDocuments]);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const effectiveDocumentId = selectedDocumentId ?? defaultDocumentId;

  const reloadItems = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetchAiReviewItemsForProjectAction(projectId);
      setItems(response.items);
      if (response.error) {
        setFetchError(response.error);
      }
    } catch {
      setFetchError("Could not load AI suggestions.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

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

  const queueItems = useMemo(
    () =>
      items.filter(
        (item) => item.status === "pending" || item.status === "adjusted"
      ),
    [items]
  );
  const pendingCount = queueItems.length;

  const drawingItems = useMemo(
    () => (centreMode === "takeoff" ? [] : items),
    [centreMode, items]
  );

  function openEvidence(item: AiReviewItem) {
    setSelectedItemId(item.id);
    setEvidenceItem(item);
    setEvidenceOpen(true);
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[28rem] flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Scope</h2>
          <p className="text-base text-muted-foreground">
            One focus at a time — triage suggestions or edit accepted takeoff,
            with the drawing alongside.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              void reloadItems();
              router.refresh();
            }}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {pendingCount > 0 ? (
            <Badge variant="outline" className="text-sm">
              {pendingCount} pending
            </Badge>
          ) : null}
        </div>
      </div>

      {fetchError ? (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {fetchError}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1.1fr)_minmax(0,0.9fr)] gap-3">
        <ScopeDocumentRail
          documents={documents}
          selectedDocumentId={effectiveDocumentId}
          onSelectDocument={setSelectedDocumentId}
        />

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div
            className="flex shrink-0 flex-wrap gap-2 border-b border-border p-3"
            role="tablist"
            aria-label="Scope workspace"
          >
            {CENTRE_MODES.map((mode) => (
              <Button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={centreMode === mode.id}
                size="default"
                variant={centreMode === mode.id ? "default" : "outline"}
                className={cn("h-10 min-w-[7rem] text-base")}
                onClick={() => setCentreMode(mode.id)}
              >
                {mode.label}
                {mode.id === "suggestions" && pendingCount > 0 ? (
                  <span className="ml-1.5 font-mono text-sm tabular-nums">
                    ({pendingCount})
                  </span>
                ) : null}
                {mode.id === "takeoff" && takeoffItems.length > 0 ? (
                  <span className="ml-1.5 font-mono text-sm tabular-nums">
                    ({takeoffItems.length})
                  </span>
                ) : null}
              </Button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            {centreMode === "discover" ? (
              <DocumentAnalysisPanel
                projectId={projectId}
                documentPages={documentPages}
              />
            ) : null}

            {centreMode === "suggestions" ? (
              <ScopeSuggestionsPanel
                projectId={projectId}
                queueItems={queueItems}
                documents={documents}
                documentPages={documentPages}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onOpenEvidence={openEvidence}
                confidenceFilter={confidenceFilter}
                onConfidenceFilter={setConfidenceFilter}
              />
            ) : null}

            {centreMode === "takeoff" ? (
              <ScopeTakeoffPanel
                projectId={projectId}
                documents={documents}
                documentPages={documentPages}
                takeoffItems={takeoffItems}
                assemblyPackages={assemblyPackages}
                takeoffAssemblies={takeoffAssemblies}
                pricingItems={pricingItems}
                organisationStandards={organisationStandards}
                projectStandardLinks={projectStandardLinks}
                onPriceManual={onPriceManual}
              />
            ) : null}
          </div>
        </section>

        <ScopeDrawingPanel
          projectId={projectId}
          items={drawingItems}
          documents={documents}
          documentPages={documentPages}
          selectedItemId={centreMode === "suggestions" ? selectedItemId : null}
          showOverlayLayer={showOverlayLayer}
          onToggleOverlay={setShowOverlayLayer}
        />
      </div>

      <AiReviewEvidenceDrawer
        item={
          evidenceItem ??
          items.find((item) => item.id === selectedItemId) ??
          null
        }
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
        takeoffItems={takeoffItems}
        takeoffAssemblies={takeoffAssemblies}
        assemblyPackages={assemblyPackages}
        materialItems={materialItems}
        labourItems={labourItems}
        pricingItems={pricingItems}
        currency={currency}
      />
    </div>
  );
}
