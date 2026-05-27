import type { TenderPackPreviewData } from "@/src/lib/submission/tender-pack-preview";

export type TenderPackSectionId =
  | "cover"
  | "commercial"
  | "exclusions"
  | "assumptions"
  | "rfis"
  | "methodologies"
  | "standards";

export type TenderPackPageKind =
  | "cover"
  | "commercial"
  | "exclusions"
  | "assumptions"
  | "rfis"
  | "methodologies"
  | "standards";

export type TenderPackVirtualPage = {
  id: string;
  sectionId: TenderPackSectionId;
  sectionLabel: string;
  kind: TenderPackPageKind;
  pageNumber: number;
  pageIndexInSection: number;
  pageCountInSection: number;
  scheduleSlice?: TenderPackPreviewData["pricingSchedule"];
  clarificationSlice?: TenderPackPreviewData["exclusions"];
  methodologySlice?: TenderPackPreviewData["methodologies"];
  standardSlice?: TenderPackPreviewData["standards"];
};

export type TenderPackNavSection = {
  id: TenderPackSectionId;
  label: string;
  pageIds: string[];
};

export type TenderPackDocumentModel = {
  pages: TenderPackVirtualPage[];
  sections: TenderPackNavSection[];
};

const PRICING_ROWS_PER_PAGE = 16;
const CLARIFICATION_ITEMS_PER_PAGE = 5;
const METHODOLOGY_ROWS_PER_PAGE = 12;
const STANDARD_ROWS_PER_PAGE = 14;

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [[]];
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildSectionPages(
  sectionId: TenderPackSectionId,
  sectionLabel: string,
  kind: TenderPackPageKind,
  count: number,
  enrich: (index: number) => Partial<TenderPackVirtualPage>
): TenderPackVirtualPage[] {
  const pageCount = Math.max(1, count);
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `${sectionId}-${index}`,
    sectionId,
    sectionLabel,
    kind,
    pageNumber: 0,
    pageIndexInSection: index,
    pageCountInSection: pageCount,
    ...enrich(index),
  }));
}

export function buildTenderPackDocument(
  data: TenderPackPreviewData
): TenderPackDocumentModel {
  const pricingChunks =
    data.pricingSchedule.length === 0
      ? []
      : chunk(data.pricingSchedule, PRICING_ROWS_PER_PAGE);
  const exclusionChunks = chunk(data.exclusions, CLARIFICATION_ITEMS_PER_PAGE);
  const assumptionChunks = chunk(data.assumptions, CLARIFICATION_ITEMS_PER_PAGE);
  const rfiChunks = chunk(
    data.rfisAndClarifications,
    CLARIFICATION_ITEMS_PER_PAGE
  );
  const methodologyChunks = chunk(data.methodologies, METHODOLOGY_ROWS_PER_PAGE);
  const standardChunks = chunk(data.standards, STANDARD_ROWS_PER_PAGE);

  const commercialPageCount = 1 + pricingChunks.length;

  const sections: TenderPackNavSection[] = [
    { id: "cover", label: "Cover", pageIds: [] },
    { id: "commercial", label: "Commercial", pageIds: [] },
    { id: "exclusions", label: "Exclusions", pageIds: [] },
    { id: "assumptions", label: "Assumptions", pageIds: [] },
    { id: "rfis", label: "RFIs", pageIds: [] },
    { id: "methodologies", label: "Methodologies", pageIds: [] },
    { id: "standards", label: "Standards", pageIds: [] },
  ];

  const coverPages = buildSectionPages("cover", "Cover", "cover", 1, () => ({}));

  const commercialPages: TenderPackVirtualPage[] = [
    {
      id: "commercial-summary",
      sectionId: "commercial",
      sectionLabel: "Commercial",
      kind: "commercial",
      pageNumber: 0,
      pageIndexInSection: 0,
      pageCountInSection: commercialPageCount,
    },
    ...pricingChunks.map((slice, index) => ({
      id: `commercial-schedule-${index}`,
      sectionId: "commercial" as const,
      sectionLabel: "Commercial",
      kind: "commercial" as const,
      pageNumber: 0,
      pageIndexInSection: index + 1,
      pageCountInSection: commercialPageCount,
      scheduleSlice: slice,
    })),
  ];

  const exclusionPages = buildSectionPages(
    "exclusions",
    "Exclusions",
    "exclusions",
    exclusionChunks.length,
    (index) => ({ clarificationSlice: exclusionChunks[index] })
  );

  const assumptionPages = buildSectionPages(
    "assumptions",
    "Assumptions",
    "assumptions",
    assumptionChunks.length,
    (index) => ({ clarificationSlice: assumptionChunks[index] })
  );

  const rfiPages = buildSectionPages(
    "rfis",
    "RFIs",
    "rfis",
    rfiChunks.length,
    (index) => ({ clarificationSlice: rfiChunks[index] })
  );

  const methodologyPages = buildSectionPages(
    "methodologies",
    "Methodologies",
    "methodologies",
    methodologyChunks.length,
    (index) => ({ methodologySlice: methodologyChunks[index] })
  );

  const standardPages = buildSectionPages(
    "standards",
    "Standards",
    "standards",
    standardChunks.length,
    (index) => ({ standardSlice: standardChunks[index] })
  );

  const pages = [
    ...coverPages,
    ...commercialPages,
    ...exclusionPages,
    ...assumptionPages,
    ...rfiPages,
    ...methodologyPages,
    ...standardPages,
  ].map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  }));

  for (const section of sections) {
    section.pageIds = pages
      .filter((page) => page.sectionId === section.id)
      .map((page) => page.id);
  }

  return { pages, sections };
}
