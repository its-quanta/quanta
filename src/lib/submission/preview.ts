import {
  computeMaterialsSummary,
  computeLabourSummary,
} from "@/src/lib/estimate-generation/summary";
import { computePricingSummary } from "@/src/lib/pricing/summary";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  Document,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TenderClarification,
} from "@/src/types/database";

export type PackItemStatus = "included" | "missing" | "needs_review";

export type TenderPackItem = {
  key: string;
  label: string;
  status: PackItemStatus;
  count: number | null;
  detail: string;
};

export type SubmissionPreviewData = {
  items: TenderPackItem[];
  pageEstimate: number;
  fileEstimate: number;
  pricingTotalSell: number | null;
};

function itemStatus(
  hasContent: boolean,
  needsReview: boolean
): PackItemStatus {
  if (!hasContent) {
    return "missing";
  }
  if (needsReview) {
    return "needs_review";
  }
  return "included";
}

export function buildSubmissionPreview(input: {
  documents: Document[];
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItemWithTakeoff[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  clarifications: TenderClarification[];
}): SubmissionPreviewData {
  const {
    documents,
    takeoffItems,
    pricingItems,
    materialItems,
    labourItems,
    clarifications,
  } = input;

  const priceableTakeoff = takeoffItems.filter((item) => item.status !== "excluded");
  const pricingSummary = computePricingSummary(pricingItems, takeoffItems);
  const materialsSummary = computeMaterialsSummary(materialItems);
  const labourSummary = computeLabourSummary(labourItems);

  const exclusions = clarifications.filter((c) => c.type === "exclusion");
  const assumptions = clarifications.filter((c) => c.type === "assumption");
  const rfis = clarifications.filter((c) => c.type === "rfi");

  const pricedCount = pricingItems.length;
  const hasPricing = pricedCount > 0;
  const unpricedCount = pricingSummary.unpricedCount;
  const openRfis = rfis.filter(
    (r) => r.status === "open" || r.status === "draft"
  ).length;

  const items: TenderPackItem[] = [
    {
      key: "pricing",
      label: "Pricing schedule",
      status: itemStatus(hasPricing, unpricedCount > 0),
      count: pricedCount,
      detail:
        unpricedCount > 0
          ? `${unpricedCount} unpriced takeoff line${unpricedCount === 1 ? "" : "s"}`
          : hasPricing
            ? "Priced takeoff lines"
            : "Add pricing in Commercial Review",
    },
    {
      key: "commercial",
      label: "Commercial summary",
      status: itemStatus(hasPricing && pricingSummary.totalSell > 0, false),
      count: null,
      detail: hasPricing
        ? "Cost, sell, and margin totals"
        : "Complete pricing first",
    },
    {
      key: "materials",
      label: "Materials schedule",
      status: itemStatus(
        materialItems.length > 0,
        materialsSummary.outstandingReviewCount > 0
      ),
      count: materialItems.length,
      detail:
        materialsSummary.outstandingReviewCount > 0
          ? `${materialsSummary.outstandingReviewCount} line${materialsSummary.outstandingReviewCount === 1 ? "" : "s"} not reviewed`
          : materialItems.length > 0
            ? "Generated material build-up"
            : "Generate from Scope Review",
    },
    {
      key: "labour",
      label: "Labour schedule",
      status: itemStatus(
        labourItems.length > 0,
        labourSummary.outstandingReviewCount > 0
      ),
      count: labourItems.length,
      detail:
        labourSummary.outstandingReviewCount > 0
          ? `${labourSummary.outstandingReviewCount} line${labourSummary.outstandingReviewCount === 1 ? "" : "s"} not reviewed`
          : labourItems.length > 0
            ? "Generated labour allowances"
            : "Generate from Scope Review",
    },
    {
      key: "exclusions",
      label: "Exclusions",
      status: itemStatus(exclusions.length > 0, false),
      count: exclusions.length,
      detail:
        exclusions.length > 0
          ? "Qualifications excluded from scope"
          : "Draft at least one exclusion",
    },
    {
      key: "assumptions",
      label: "Assumptions",
      status: itemStatus(assumptions.length > 0, false),
      count: assumptions.length,
      detail:
        assumptions.length > 0
          ? "Conditions assumed in pricing"
          : "Draft at least one assumption",
    },
    {
      key: "rfis",
      label: "RFIs",
      status: itemStatus(rfis.length > 0, openRfis > 0),
      count: rfis.length,
      detail:
        openRfis > 0
          ? `${openRfis} open RFI${openRfis === 1 ? "" : "s"}`
          : rfis.length > 0
            ? "RFI log for the tender"
            : "Optional — add if required",
    },
    {
      key: "documents",
      label: "Uploaded documents",
      status: itemStatus(documents.length > 0, false),
      count: documents.length,
      detail:
        documents.length > 0
          ? "Tender document register"
          : "Upload drawings and specs in Tender Inputs",
    },
  ];

  const documentPages = documents.reduce(
    (sum, doc) => sum + (doc.page_count ?? 1),
    0
  );
  const takeoffPages = Math.max(1, Math.ceil(priceableTakeoff.length / 12));
  const clarificationPages = Math.max(
    1,
    Math.ceil(clarifications.length / 8)
  );
  const pricingPages = hasPricing ? Math.max(1, Math.ceil(pricedCount / 15)) : 0;

  const pageEstimate =
    documentPages +
    takeoffPages +
    pricingPages +
    clarificationPages +
    (hasPricing ? 2 : 0);

  const fileEstimate = items.filter((i) => i.status !== "missing").length;

  return {
    items,
    pageEstimate,
    fileEstimate,
    pricingTotalSell:
      hasPricing && pricingSummary.totalSell > 0
        ? pricingSummary.totalSell
        : null,
  };
}

export function buildTenderPackPreviewText(input: {
  project: Project;
  preview: SubmissionPreviewData;
  clarifications: TenderClarification[];
  formatMoney: (value: number | null) => string;
  formatDate: (value: string | null) => string;
}): string {
  const { project, preview, clarifications, formatMoney, formatDate } = input;
  const lines: string[] = [
    "TENDER PACK PREVIEW",
    "===================",
    "",
    `Project: ${project.name}`,
    project.client_name ? `Client: ${project.client_name}` : "",
    `Due: ${formatDate(project.tender_due_date)}`,
    `Tender value: ${formatMoney(project.estimated_value)}`,
    `Calculated sell: ${formatMoney(preview.pricingTotalSell)}`,
    "",
    "CONTENTS",
    "--------",
  ].filter(Boolean);

  for (const item of preview.items) {
    const statusLabel =
      item.status === "included"
        ? "Included"
        : item.status === "needs_review"
          ? "Needs review"
          : "Missing";
    const count =
      item.count !== null ? ` (${item.count})` : "";
    lines.push(`• ${item.label}${count} — ${statusLabel}`);
    lines.push(`  ${item.detail}`);
  }

  lines.push("");
  lines.push(
    `Estimate: ~${preview.pageEstimate} pages · ~${preview.fileEstimate} sections`
  );
  lines.push("");
  lines.push("EXCLUSIONS");
  lines.push("----------");
  const exclusions = clarifications.filter((c) => c.type === "exclusion");
  if (exclusions.length === 0) {
    lines.push("(none recorded)");
  } else {
    for (const row of exclusions) {
      lines.push(`• ${row.title}`);
      if (row.description) {
        lines.push(`  ${row.description}`);
      }
    }
  }

  lines.push("");
  lines.push("ASSUMPTIONS");
  lines.push("-----------");
  const assumptions = clarifications.filter((c) => c.type === "assumption");
  if (assumptions.length === 0) {
    lines.push("(none recorded)");
  } else {
    for (const row of assumptions) {
      lines.push(`• ${row.title}`);
      if (row.description) {
        lines.push(`  ${row.description}`);
      }
    }
  }

  lines.push("");
  lines.push("RFIs");
  lines.push("----");
  const rfis = clarifications.filter((c) => c.type === "rfi");
  if (rfis.length === 0) {
    lines.push("(none recorded)");
  } else {
    for (const row of rfis) {
      lines.push(`• [${row.status}] ${row.title}`);
      if (row.related_drawing) {
        lines.push(`  Drawing: ${row.related_drawing}`);
      }
      if (row.description) {
        lines.push(`  ${row.description}`);
      }
    }
  }

  lines.push("");
  lines.push("—");
  lines.push("Draft preview only. Export not enabled in this release.");

  return lines.join("\n");
}
