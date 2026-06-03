"use client";

import { useMemo, useState } from "react";

import { AiReviewApprovalQueue } from "@/components/ai-review/ai-review-approval-queue";
import { AiReviewDocumentViewer } from "@/components/ai-review/ai-review-document-viewer";
import { AiReviewEvidenceDrawer } from "@/components/ai-review/ai-review-evidence-drawer";
import {
  AiReviewModeBar,
} from "@/components/ai-review/ai-review-mode-bar";
import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import { tradeColour } from "@/src/lib/ai-review/overlay";
import { computeAiReviewModeMetrics } from "@/src/lib/ai-review/review-metrics";
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

type AiReviewCanvasProps = {
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

const TRADE_LEGEND = [
  "Carpentry",
  "Demolition",
  "Partitions",
  "Electrical",
  "Plumbing",
  "General",
] as const;

export function AiReviewCanvas({
  projectId,
  items,
  documents,
  documentPages,
  takeoffItems,
  takeoffAssemblies,
  assemblyPackages,
  materialItems,
  labourItems,
  pricingItems,
}: AiReviewCanvasProps) {
  const currency = useOrganisationCurrency();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items[0]?.id ?? null
  );
  const [evidenceItem, setEvidenceItem] = useState<AiReviewItem | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [showOverlayLayer, setShowOverlayLayer] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState<
    "medium" | "low" | null
  >(null);

  const metrics = useMemo(() => computeAiReviewModeMetrics(items), [items]);

  const queueItems = useMemo(
    () =>
      items.filter(
        (item) => item.status === "pending" || item.status === "adjusted"
      ),
    [items]
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  function openEvidence(item: AiReviewItem) {
    setSelectedItemId(item.id);
    setEvidenceItem(item);
    setEvidenceOpen(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <AiReviewModeBar
        projectId={projectId}
        items={items}
        metrics={metrics}
        activeConfidenceFilter={confidenceFilter}
        onFocusConfidence={setConfidenceFilter}
      />

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        {TRADE_LEGEND.map((trade) => (
          <span key={trade} className="inline-flex items-center gap-1">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: tradeColour(trade) }}
              aria-hidden
            />
            {trade}
          </span>
        ))}
      </div>

      <div className="grid min-h-[calc(100vh-16rem)] gap-3 lg:grid-cols-[7fr_3fr] lg:items-stretch">
        <section className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <h3 className="text-sm font-medium">Drawing viewer</h3>
            <p className="text-xs text-muted-foreground">
              PDF canvas · pages · zoom · overlay · compare
            </p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <AiReviewDocumentViewer
              projectId={projectId}
              items={items}
              documents={documents}
              documentPages={documentPages}
              selectedItemId={selectedItemId}
              showOverlayLayer={showOverlayLayer}
              onToggleOverlay={setShowOverlayLayer}
            />
          </div>
        </section>

        <section className="flex min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <h3 className="text-sm font-medium">Approval queue</h3>
            <p className="text-xs text-muted-foreground">
              {queueItems.length} pending suggestion
              {queueItems.length === 1 ? "" : "s"}
              {items.length > queueItems.length
                ? ` · ${items.length} total`
                : ""}
            </p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <AiReviewApprovalQueue
              projectId={projectId}
              items={queueItems}
              allItems={items}
              documents={documents}
              documentPages={documentPages}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onOpenEvidence={openEvidence}
              confidenceFilter={confidenceFilter}
            />
          </div>
        </section>
      </div>

      <AiReviewEvidenceDrawer
        item={evidenceItem ?? selectedItem}
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
