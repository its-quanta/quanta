"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DOCUMENT_CLASSIFICATION_LABELS,
  PROCESSING_STATUS_LABELS,
} from "@/src/lib/documents/constants";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  formatQuantity,
} from "@/src/lib/format";
import type { TenderPackPreviewData } from "@/src/lib/submission/tender-pack-preview";
import type { DocumentClassification, OrganisationCurrency } from "@/src/types/database";
import { cn } from "@/lib/utils";

type TenderPackPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TenderPackPreviewData;
  currency: OrganisationCurrency;
};

function PreviewSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptySectionNote({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function SummaryGrid({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TenderPackPreviewModal({
  open,
  onOpenChange,
  data,
  currency,
}: TenderPackPreviewModalProps) {
  const money = (value: number | null | undefined) =>
    formatCurrency(value, currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-3 border-b border-border bg-card px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-lg">Tender pack preview</DialogTitle>
              <DialogDescription className="mt-1">
                Review what your client would receive before exporting.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-900"
            >
              Preview only — export not generated yet
            </Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--background)] px-6 py-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-10 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <PreviewSection
              title="Cover summary"
              description="Tender identification and issue details."
            >
              <SummaryGrid
                rows={[
                  { label: "Project", value: data.cover.projectName },
                  {
                    label: "Client",
                    value: data.cover.clientName ?? "—",
                  },
                  {
                    label: "Project type",
                    value: data.cover.projectType ?? "—",
                  },
                  {
                    label: "Trade scope",
                    value: data.cover.tradeScope ?? "—",
                  },
                  {
                    label: "Tender due",
                    value: formatDate(data.cover.tenderDueDate),
                  },
                  {
                    label: "Tender value",
                    value: money(data.cover.tenderValue),
                  },
                  {
                    label: "Prepared by",
                    value: data.cover.organisationName,
                  },
                  {
                    label: "Date generated",
                    value: formatDateTime(data.cover.generatedAt),
                  },
                ]}
              />
            </PreviewSection>

            <PreviewSection
              title="Commercial summary"
              description="Totals from priced takeoff lines."
            >
              <SummaryGrid
                rows={[
                  { label: "Total cost", value: money(data.commercial.totalCost) },
                  { label: "Total sell", value: money(data.commercial.totalSell) },
                  {
                    label: "Gross profit",
                    value: money(data.commercial.grossProfit),
                  },
                  {
                    label: "Margin",
                    value: formatPercent(data.commercial.marginPercent),
                  },
                  {
                    label: "Pricing coverage",
                    value: formatPercent(data.commercial.pricingCoveragePercent),
                  },
                  {
                    label: "Package coverage",
                    value: formatPercent(data.commercial.packageCoveragePercent),
                  },
                ]}
              />
            </PreviewSection>

            <PreviewSection
              title="Pricing schedule"
              description="Priced takeoff lines included in the tender."
            >
              {data.pricingSchedule.length === 0 ? (
                <EmptySectionNote message="No priced lines yet. Complete pricing in Commercial Review." />
              ) : (
                <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Item</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Cost rate</TableHead>
                        <TableHead className="text-right">Sell rate</TableHead>
                        <TableHead className="text-right">Total sell</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pricingSchedule.map((row, index) => (
                        <TableRow key={`${row.takeoffItemName}-${index}`}>
                          <TableCell className="font-medium">
                            {row.takeoffItemName}
                          </TableCell>
                          <TableCell>{row.trade}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQuantity(row.quantity)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.unit}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.pricingSource}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.costRate)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.sellRate)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-medium">
                            {money(row.totalSell)}
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                            {row.notes ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Materials schedule">
              {data.materials.length === 0 ? (
                <EmptySectionNote message="No material lines generated for this tender." />
              ) : (
                <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Total cost</TableHead>
                        <TableHead>Package</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.materials.map((row, index) => (
                        <TableRow key={`${row.materialName}-${index}`}>
                          <TableCell className="font-medium">
                            {row.materialName}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQuantity(row.quantity)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.unit}
                          </TableCell>
                          <TableCell>{row.supplier ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.totalCost)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.packageSource}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Labour schedule">
              {data.labour.length === 0 ? (
                <EmptySectionNote message="No labour lines generated for this tender." />
              ) : (
                <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Cost rate</TableHead>
                        <TableHead className="text-right">Charge rate</TableHead>
                        <TableHead className="text-right">Total cost</TableHead>
                        <TableHead className="text-right">Total sell</TableHead>
                        <TableHead>Package</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.labour.map((row, index) => (
                        <TableRow key={`${row.labourRole}-${index}`}>
                          <TableCell className="font-medium">
                            {row.labourRole}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQuantity(row.hours)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.costRate)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.chargeRate)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.totalCost)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.totalSell)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.packageSource}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Exclusions">
              {data.exclusions.length === 0 ? (
                <EmptySectionNote message="No exclusions recorded." />
              ) : (
                <ClarificationList items={data.exclusions} />
              )}
            </PreviewSection>

            <PreviewSection title="Assumptions">
              {data.assumptions.length === 0 ? (
                <EmptySectionNote message="No assumptions recorded." />
              ) : (
                <ClarificationList items={data.assumptions} />
              )}
            </PreviewSection>

            <PreviewSection
              title="RFIs and clarifications"
              description="Requests for information and clarification log."
            >
              {data.rfisAndClarifications.length === 0 ? (
                <EmptySectionNote message="No RFIs or clarifications recorded." />
              ) : (
                <ClarificationList items={data.rfisAndClarifications} showStatus />
              )}
            </PreviewSection>

            <PreviewSection title="Documents included">
              {data.documents.length === 0 ? (
                <EmptySectionNote message="No documents uploaded for this project." />
              ) : (
                <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>File name</TableHead>
                        <TableHead>Document type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.documents.map((row) => (
                        <TableRow key={row.fileName}>
                          <TableCell className="font-medium">
                            {row.fileName}
                          </TableCell>
                          <TableCell>
                            {DOCUMENT_CLASSIFICATION_LABELS[
                              row.documentType as DocumentClassification
                            ] ?? row.documentType}
                          </TableCell>
                          <TableCell>
                            {PROCESSING_STATUS_LABELS[
                              row.status as keyof typeof PROCESSING_STATUS_LABELS
                            ] ?? row.status}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PreviewSection>

            {data.readiness ? (
              <PreviewSection
                title="Readiness warnings"
                description="Resolve these items before issuing the tender."
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
              >
                <ReadinessWarnings readiness={data.readiness} />
              </PreviewSection>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-card px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled
            title="PDF export is not available in this release"
          >
            Generate PDF export — Coming soon
          </Button>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClarificationList({
  items,
  showStatus = false,
}: {
  items: TenderPackPreviewData["exclusions"];
  showStatus?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((row, index) => (
        <li
          key={`${row.title}-${index}`}
          className="rounded-md border border-border bg-muted/10 px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{row.title}</p>
            {showStatus ? (
              <Badge variant="outline" className="text-xs capitalize">
                {row.status}
              </Badge>
            ) : null}
            {row.priority ? (
              <Badge variant="outline" className="text-xs capitalize">
                {row.priority}
              </Badge>
            ) : null}
          </div>
          {row.relatedDrawing ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Drawing: {row.relatedDrawing}
            </p>
          ) : null}
          {row.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{row.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ReadinessWarnings({
  readiness,
}: {
  readiness: NonNullable<TenderPackPreviewData["readiness"]>;
}) {
  const hasContent =
    readiness.criticalIssues.length > 0 ||
    readiness.warnings.length > 0 ||
    readiness.missingItems.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {readiness.criticalIssues.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            Critical
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {readiness.criticalIssues.map((issue) => (
              <li
                key={issue.title}
                className="rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm"
              >
                <p className="font-medium">{issue.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {issue.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {readiness.warnings.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Warnings
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {readiness.warnings.map((issue) => (
              <li
                key={issue.title}
                className="rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm"
              >
                <p className="font-medium">{issue.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {issue.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {readiness.missingItems.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Missing from pack
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {readiness.missingItems.map((item) => (
              <li
                key={item.label}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
