"use client";

import { useState, type ReactNode } from "react";

import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import { TakeoffStatusBadge } from "@/components/takeoff/takeoff-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatQuantity } from "@/src/lib/format";
import type { TakeoffItemRelationshipsView } from "@/src/lib/takeoff/item-relationships";

type TakeoffItemRelationshipsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: TakeoffItemRelationshipsView | null;
  onOpenPackage: (packageId: string) => void;
  onOpenPricing: (takeoffItemId: string) => void;
  onOpenMaterials: () => void;
  onOpenLabour: () => void;
  onOpenStandards: () => void;
  onOpenSubmission: () => void;
  onOpenSource: () => void;
};

function RelationshipSection({
  title,
  defaultOpen = true,
  action,
  children,
  empty,
}: {
  title: string;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
  empty?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && !empty);

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          {action ? <div className="flex justify-end">{action}</div> : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "success" | "warning" | "violet";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        tone === "success" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
        tone === "warning" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-900",
        tone === "violet" &&
          "border-violet-500/30 bg-violet-500/10 text-violet-800",
        tone === "neutral" && "text-muted-foreground"
      )}
    >
      {label}
    </Badge>
  );
}

function LinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto px-0 text-xs"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function TakeoffItemRelationshipsDrawer({
  open,
  onOpenChange,
  view,
  onOpenPackage,
  onOpenPricing,
  onOpenMaterials,
  onOpenLabour,
  onOpenStandards,
  onOpenSubmission,
  onOpenSource,
}: TakeoffItemRelationshipsDrawerProps) {
  const currency = useOrganisationCurrency();

  if (!view) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md" />
      </Sheet>
    );
  }

  const clarificationCount =
    view.clarifications.rfis.length +
    view.clarifications.exclusions.length +
    view.clarifications.assumptions.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-3 border-b border-border px-4 py-4 pr-12">
          <div>
            <SheetTitle className="text-base leading-snug">
              {view.itemName}
            </SheetTitle>
            <SheetDescription className="mt-1">
              Estimator evidence — connected project data for this takeoff line.
            </SheetDescription>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Trade</dt>
              <dd>{view.trade}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Quantity</dt>
              <dd className="font-mono tabular-nums">
                {formatQuantity(view.quantity)} {view.unit}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                <TakeoffStatusBadge status={view.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reviewed</dt>
              <dd>{view.reviewed ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-1.5">
            {view.badges.packageApplied ? (
              <StatusBadge label="Package applied" tone="violet" />
            ) : null}
            {view.badges.reviewed ? (
              <StatusBadge label="Reviewed" tone="success" />
            ) : null}
            {view.badges.pricingComplete ? (
              <StatusBadge label="Pricing complete" tone="success" />
            ) : null}
            {view.badges.ready ? (
              <StatusBadge label="Ready" tone="success" />
            ) : null}
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          <RelationshipSection
            title="Methodology"
            empty={!view.methodology}
            action={
              view.methodology ? (
                <LinkButton
                  onClick={() => onOpenPackage(view.methodology!.packageId)}
                >
                  Open package
                </LinkButton>
              ) : undefined
            }
          >
            {view.methodology ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{view.methodology.packageName}</p>
                <p className="text-muted-foreground">
                  {view.methodology.trade ?? "—"} · {view.methodology.unit}
                </p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  Margin{" "}
                  {view.methodology.marginPercent != null
                    ? formatPercent(view.methodology.marginPercent)
                    : "—"}{" "}
                  · Markup{" "}
                  {view.methodology.markupPercent != null
                    ? formatPercent(view.methodology.markupPercent)
                    : "—"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No methodology linked
              </p>
            )}
          </RelationshipSection>

          <RelationshipSection
            title="Pricing"
            empty={!view.pricing}
            action={
              view.pricing ? (
                <LinkButton
                  onClick={() => onOpenPricing(view.takeoffItemId)}
                >
                  Open pricing
                </LinkButton>
              ) : undefined
            }
          >
            {view.pricing ? (
              <div className="space-y-1 text-sm">
                <p className="font-mono tabular-nums">
                  Cost {formatCurrency(view.pricing.totalCost, currency)} · Sell{" "}
                  {formatCurrency(view.pricing.totalSell, currency)}
                </p>
                <p className="text-muted-foreground">
                  Margin{" "}
                  {view.pricing.marginPercent != null
                    ? formatPercent(view.pricing.marginPercent)
                    : "—"}{" "}
                  · {view.pricing.pricingSourceLabel}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not priced yet</p>
            )}
          </RelationshipSection>

          <RelationshipSection
            title="Materials"
            defaultOpen={view.materials.lines.length <= 4}
            empty={view.materials.lines.length === 0}
            action={
              view.materials.lines.length > 0 ? (
                <LinkButton onClick={onOpenMaterials}>Open materials</LinkButton>
              ) : undefined
            }
          >
            {view.materials.lines.length > 0 ? (
              <div className="space-y-1.5">
                <ul className="space-y-1 text-sm">
                  {view.materials.lines.map((line) => (
                    <li
                      key={line.id}
                      className="flex justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">{line.name}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatQuantity(line.quantity)} {line.unit}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-border pt-1.5 text-xs font-medium tabular-nums">
                  Total material cost{" "}
                  {formatCurrency(view.materials.totalCost, currency)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No generated materials
              </p>
            )}
          </RelationshipSection>

          <RelationshipSection
            title="Labour"
            defaultOpen={view.labour.lines.length <= 4}
            empty={view.labour.lines.length === 0}
            action={
              view.labour.lines.length > 0 ? (
                <LinkButton onClick={onOpenLabour}>Open labour</LinkButton>
              ) : undefined
            }
          >
            {view.labour.lines.length > 0 ? (
              <div className="space-y-1.5">
                <ul className="space-y-1 text-sm">
                  {view.labour.lines.map((line) => (
                    <li
                      key={line.id}
                      className="flex justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">{line.name}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatQuantity(line.hours)} hr
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-border pt-1.5 text-xs font-medium tabular-nums">
                  Total labour cost{" "}
                  {formatCurrency(view.labour.totalCost, currency)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No generated labour
              </p>
            )}
          </RelationshipSection>

          <RelationshipSection
            title="Standards"
            defaultOpen={view.standards.length <= 3}
            empty={view.standards.length === 0}
            action={
              view.standards.length > 0 ? (
                <LinkButton onClick={onOpenStandards}>Open standards</LinkButton>
              ) : undefined
            }
          >
            {view.standards.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {view.standards.map((standard) => (
                  <li key={standard.linkId}>
                    <span className="font-mono text-xs">
                      {standard.referenceCode}
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    {standard.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No standards linked
              </p>
            )}
          </RelationshipSection>

          <RelationshipSection
            title="Clarifications"
            defaultOpen={clarificationCount <= 3}
            empty={clarificationCount === 0}
            action={
              clarificationCount > 0 ? (
                <LinkButton onClick={onOpenSubmission}>
                  Open submission
                </LinkButton>
              ) : undefined
            }
          >
            {clarificationCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                No related clarifications
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {view.clarifications.rfis.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      RFIs
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {view.clarifications.rfis.map((row) => (
                        <li key={row.id}>{row.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {view.clarifications.exclusions.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Exclusions
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {view.clarifications.exclusions.map((row) => (
                        <li key={row.id}>{row.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {view.clarifications.assumptions.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Assumptions
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {view.clarifications.assumptions.map((row) => (
                        <li key={row.id}>{row.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </RelationshipSection>

          <RelationshipSection title="Documents">
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Document </span>
                {view.documents.sourceDocumentName ?? "—"}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                Ref {view.documents.drawingReference ?? "—"} · Sheet{" "}
                {view.documents.sheetNumber ?? "—"} · Page{" "}
                {view.documents.pageNumber ?? "—"}
              </p>
              <LinkButton onClick={onOpenSource}>Open source</LinkButton>
            </div>
          </RelationshipSection>

          <RelationshipSection title="Submission">
            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">In tender </span>
                {view.submission.includedInTender ? "Yes" : "No"}
              </p>
              <p>
                <span className="text-muted-foreground">Readiness </span>
                <span
                  className={cn(
                    view.submission.readinessStatus === "Ready" &&
                      "text-emerald-800",
                    view.submission.readinessStatus === "Needs attention" &&
                      "text-amber-900"
                  )}
                >
                  {view.submission.readinessStatus}
                </span>
              </p>
              {view.submission.blockers.length > 0 ? (
                <ul className="list-inside list-disc text-xs text-amber-900">
                  {view.submission.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No blockers on this line
                </p>
              )}
              <LinkButton onClick={onOpenSubmission}>
                Open submission
              </LinkButton>
            </div>
          </RelationshipSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}
