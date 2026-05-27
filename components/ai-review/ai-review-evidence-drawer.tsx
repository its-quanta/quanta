"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AiReviewAdjustDialog } from "@/components/ai-review/ai-review-adjust-dialog";
import { AiReviewConfidenceBadge } from "@/components/ai-review/ai-review-confidence-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  AI_REVIEW_APPROVAL_ACTION_LABELS,
  type AiReviewApprovalEvent,
} from "@/src/lib/ai-review/approval-history";
import {
  acceptAiReviewItemAction,
  fetchAiReviewApprovalHistoryAction,
  rejectAiReviewItemAction,
} from "@/src/lib/ai-review/actions";
import { formatCurrency, formatQuantity } from "@/src/lib/format";
import { buildDrawingReferenceContext } from "@/src/lib/takeoff/drawing-reference";
import type {
  AiReviewItem,
  AssemblyPackage,
  Document,
  DocumentPage,
  OrganisationCurrency,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type AiReviewEvidenceDrawerProps = {
  item: AiReviewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  pricingItems: PricingItem[];
  currency: OrganisationCurrency;
};

export function AiReviewEvidenceDrawer({
  item,
  open,
  onOpenChange,
  projectId,
  documents,
  documentPages,
  takeoffItems,
  takeoffAssemblies,
  materialItems,
  labourItems,
  pricingItems,
  currency,
}: AiReviewEvidenceDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [history, setHistory] = useState<AiReviewApprovalEvent[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const linkedTakeoff = useMemo(() => {
    if (!item?.result_takeoff_item_id) {
      return null;
    }
    return takeoffItems.find((row) => row.id === item.result_takeoff_item_id) ?? null;
  }, [item?.result_takeoff_item_id, takeoffItems]);

  const assembly = useMemo(() => {
    if (!linkedTakeoff) {
      return null;
    }
    return (
      takeoffAssemblies.find((row) => row.takeoff_item_id === linkedTakeoff.id) ??
      null
    );
  }, [linkedTakeoff, takeoffAssemblies]);

  const pricing = useMemo(() => {
    if (!linkedTakeoff) {
      return null;
    }
    return pricingItems.find((row) => row.takeoff_item_id === linkedTakeoff.id) ?? null;
  }, [linkedTakeoff, pricingItems]);

  const linkedMaterials = useMemo(() => {
    if (!linkedTakeoff) {
      return [];
    }
    return materialItems.filter((row) => row.takeoff_item_id === linkedTakeoff.id);
  }, [linkedTakeoff, materialItems]);

  const linkedLabour = useMemo(() => {
    if (!linkedTakeoff) {
      return [];
    }
    return labourItems.filter((row) => row.takeoff_item_id === linkedTakeoff.id);
  }, [linkedTakeoff, labourItems]);

  useEffect(() => {
    if (!open || !item) {
      return;
    }
    let cancelled = false;
    void fetchAiReviewApprovalHistoryAction(item.id, projectId).then((result) => {
      if (!cancelled) {
        setHistory(result.events);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, item, projectId]);

  if (!item) {
    return null;
  }

  const documentName = item.source_document_id
    ? drawingContext.documentNames.get(item.source_document_id) ?? "—"
    : "—";

  const canDecide = item.status === "pending" || item.status === "adjusted";

  function runAction(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.error) {
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle className="pr-6 text-base">{item.description}</SheetTitle>
            <SheetDescription>
              {item.trade} · Evidence and commercial context
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Drawing</dt>
                <dd className="mt-0.5">{documentName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Page</dt>
                <dd className="mt-0.5 font-mono text-xs tabular-nums">
                  {item.page_number ?? "—"}
                  {item.sheet_number ? ` · ${item.sheet_number}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Reference</dt>
                <dd className="mt-0.5 font-mono text-xs">
                  {item.drawing_reference ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Quantity</dt>
                <dd className="mt-0.5 font-mono text-sm tabular-nums">
                  {formatQuantity(item.quantity)} {item.unit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Confidence</dt>
                <dd className="mt-1">
                  <AiReviewConfidenceBadge confidence={item.confidence} />
                </dd>
              </div>
            </dl>

            {item.reasoning ? (
              <div className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Detection explanation
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{item.reasoning}</p>
              </div>
            ) : null}

            <Separator className="my-4" />

            <section className="space-y-3 text-sm">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Build-up impact
              </h3>
              {linkedTakeoff ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Package</p>
                    <p className="mt-0.5 font-medium">
                      {assembly?.assembly_package?.name ?? "Not applied"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Materials</p>
                    <p className="mt-0.5">
                      {linkedMaterials.length === 0
                        ? "None generated"
                        : `${linkedMaterials.length} line${linkedMaterials.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Labour</p>
                    <p className="mt-0.5">
                      {linkedLabour.length === 0
                        ? "None generated"
                        : `${linkedLabour.length} line${linkedLabour.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Commercial impact</p>
                    <p className="mt-0.5 font-mono text-sm tabular-nums">
                      {pricing
                        ? `${formatCurrency(pricing.total_sell, currency)} sell`
                        : "Not priced yet — approve then price on Commercial"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Approve this suggestion to create a takeoff line and link package,
                  materials, labour, and pricing.
                </p>
              )}
            </section>

            {history.length > 0 ? (
              <>
                <Separator className="my-4" />
                <section>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Approval history
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {history.map((event) => (
                      <li
                        key={event.id}
                        className="rounded-md border border-border px-2 py-1.5 text-xs"
                      >
                        {AI_REVIEW_APPROVAL_ACTION_LABELS[event.action]}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-border bg-muted/20 p-4">
            {canDecide ? (
              <>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAction(() => acceptAiReviewItemAction(item.id, projectId))
                  }
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setAdjustOpen(true)}
                >
                  Adjust
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() =>
                    runAction(() => rejectAiReviewItemAction(item.id, projectId))
                  }
                >
                  Reject
                </Button>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AiReviewAdjustDialog
        item={item}
        projectId={projectId}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onSuccess={() => {
          router.refresh();
          onOpenChange(false);
        }}
      />
    </>
  );
}
