import { MAX_ANALYSIS_BATCH_PAGES } from "@/src/lib/ai-review/document-analysis/constants";

export const TOO_MANY_PAGES_MESSAGE =
  "Select 10 pages or fewer for this release.";

export type ParsePageRangesOptions = {
  /** Known document page count; omit to skip upper-bound checks. */
  maxPage?: number;
  /** Maximum number of pages allowed in one batch (default: MVP limit). */
  maxSelected?: number;
};

export type ParsePageRangesResult = {
  pages: number[];
  error?: string;
};

/**
 * Parse page range input into unique sorted 1-based page numbers.
 * Examples: "1-5" → [1..5]; "1,3,5" → [1,3,5]; "1-3,8,10-12" → [1,2,3,8,10,11,12]
 */
export function parsePageRanges(
  input: string,
  options: ParsePageRangesOptions = {}
): ParsePageRangesResult {
  const maxSelected = options.maxSelected ?? MAX_ANALYSIS_BATCH_PAGES;
  const trimmed = input.trim();

  if (!trimmed) {
    return { pages: [], error: "No pages selected." };
  }

  const pages = new Set<number>();

  for (const segment of trimmed.split(",")) {
    const part = segment.trim();
    if (!part) {
      continue;
    }

    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1 || start > end) {
        return { pages: [], error: `Invalid range: ${part}` };
      }
      if (options.maxPage != null && end > options.maxPage) {
        return {
          pages: [],
          error: `Range ${part} exceeds document page count (${options.maxPage}).`,
        };
      }
      for (let n = start; n <= end; n += 1) {
        pages.add(n);
      }
      continue;
    }

    const single = Number(part);
    if (!Number.isInteger(single) || single < 1) {
      return { pages: [], error: `Invalid page: ${part}` };
    }
    if (options.maxPage != null && single > options.maxPage) {
      return {
        pages: [],
        error: `Page ${single} exceeds document page count (${options.maxPage}).`,
      };
    }
    pages.add(single);
  }

  const sorted = [...pages].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return { pages: [], error: "No pages selected." };
  }

  if (sorted.length > maxSelected) {
    return { pages: [], error: TOO_MANY_PAGES_MESSAGE };
  }

  return { pages: sorted };
}
