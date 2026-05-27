import {
  MAX_ANALYSIS_BATCH_PAGES,
  type DocumentPageType,
} from "@/src/lib/ai-review/document-analysis/constants";
import { parsePageRanges } from "@/src/lib/ai-review/document-analysis/page-ranges";
import type { DocumentPage } from "@/src/types/database";

export { parsePageRanges, TOO_MANY_PAGES_MESSAGE } from "@/src/lib/ai-review/document-analysis/page-ranges";

export type PageSelectionPreset =
  | "first_10"
  | "selected_only"
  | "custom"
  | "floor_plans"
  | "schedules"
  | "specifications";

/** @deprecated Prefer parsePageRanges */
export function parsePageSelectionInput(
  input: string,
  maxPage: number
): { pages: number[]; error?: string } {
  if (!input.trim()) {
    return { pages: [] };
  }
  return parsePageRanges(input, {
    maxPage: maxPage > 0 ? maxPage : undefined,
    maxSelected: MAX_ANALYSIS_BATCH_PAGES,
  });
}

export function clampPageSelection(
  pageNumbers: number[],
  maxPages: number = MAX_ANALYSIS_BATCH_PAGES
): number[] {
  const unique = [...new Set(pageNumbers.filter((n) => n > 0))].sort(
    (a, b) => a - b
  );
  return unique.slice(0, maxPages);
}

export function resolvePagePreset(input: {
  preset: PageSelectionPreset;
  pageCount: number;
  selectedPages: number[];
  documentPages: DocumentPage[];
  documentId: string;
}): number[] {
  const { preset, pageCount, selectedPages, documentPages, documentId } = input;

  if (preset === "first_10") {
    const end = Math.min(pageCount, MAX_ANALYSIS_BATCH_PAGES);
    return Array.from({ length: end }, (_, index) => index + 1);
  }

  if (preset === "selected_only" || preset === "custom") {
    return clampPageSelection(selectedPages);
  }

  const typeByPreset: Record<
    Exclude<PageSelectionPreset, "first_10" | "selected_only" | "custom">,
    DocumentPageType
  > = {
    floor_plans: "floor_plan",
    schedules: "schedule",
    specifications: "specification",
  };

  const pageType = typeByPreset[preset as keyof typeof typeByPreset];
  const typedPages = documentPages
    .filter(
      (row) =>
        row.document_id === documentId &&
        row.page_type === pageType &&
        row.include_in_analysis
    )
    .map((row) => row.page_number);

  if (typedPages.length > 0) {
    return clampPageSelection(typedPages);
  }

  // Manual tagging fallback: match sheet title / label keywords.
  const keywords: Record<DocumentPageType, string[]> = {
    floor_plan: ["floor", "plan", "layout", "ga"],
    schedule: ["schedule", "door", "finish"],
    specification: ["spec", "specification", "nbs"],
    other: [],
  };

  const matches = documentPages
    .filter((row) => row.document_id === documentId)
    .filter((row) => {
      const haystack = `${row.page_label ?? ""} ${row.sheet_title ?? ""} ${
        row.sheet_number ?? ""
      }`.toLowerCase();
      return keywords[pageType].some((word) => haystack.includes(word));
    })
    .map((row) => row.page_number);

  return clampPageSelection(matches);
}

export function estimatePdfBatchBytes(
  fileSizeBytes: number,
  pageCount: number,
  selectedPageCount: number
): number {
  if (pageCount <= 0 || selectedPageCount <= 0) {
    return fileSizeBytes;
  }
  const ratio = Math.min(1, selectedPageCount / pageCount);
  return Math.ceil(fileSizeBytes * ratio * 1.15);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
