import { MAX_ANALYSIS_BATCH_PAGES } from "@/src/lib/ai-review/document-analysis/constants";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import { parsePageRanges } from "@/src/lib/ai-review/document-analysis/page-ranges";
import {
  resolvePagePreset,
  type PageSelectionPreset,
} from "@/src/lib/ai-review/document-analysis/page-selection";
import type { DocumentPage } from "@/src/types/database";

export function normalizeSelectedPageNumbers(
  ...sources: Array<number[] | undefined>
): number[] {
  const pages = new Set<number>();
  for (const source of sources) {
    for (const value of source ?? []) {
      const n = Number(value);
      if (Number.isInteger(n) && n > 0) {
        pages.add(n);
      }
    }
  }
  return [...pages].sort((a, b) => a - b);
}

export type ResolveSelectedPagesInput = {
  selectedPages?: number[];
  selected_pages?: number[];
  selectedDocumentPageIds?: string[];
  pageNumbers?: number[];
  pageRangeInput?: string;
  preset?: PageSelectionPreset;
};

function resolvePagesFromRegisterIds(
  documentPageIds: string[],
  documentPages: DocumentPage[],
  documentId: string
): number[] {
  const idSet = new Set(documentPageIds);
  return documentPages
    .filter(
      (row) => row.document_id === documentId && idSet.has(row.id)
    )
    .map((row) => row.page_number)
    .sort((a, b) => a - b);
}

export function resolveSelectedPagesForAnalysis(input: {
  body: ResolveSelectedPagesInput;
  isPdf: boolean;
  pageCount: number | null;
  pageCountKnown: boolean;
  documentPages: DocumentPage[];
  documentId: string;
}): { pages: number[]; error?: string } {
  if (!input.isPdf) {
    return { pages: [1] };
  }

  const maxPage =
    input.pageCountKnown && input.pageCount != null && input.pageCount > 0
      ? input.pageCount
      : undefined;

  const fromRegister = resolvePagesFromRegisterIds(
    input.body.selectedDocumentPageIds ?? [],
    input.documentPages,
    input.documentId
  );

  if (fromRegister.length > 0) {
    if (fromRegister.length > MAX_ANALYSIS_BATCH_PAGES) {
      return { pages: [], error: ANALYSIS_ERRORS.tooManyPages };
    }
    return { pages: fromRegister };
  }

  const fromBody = normalizeSelectedPageNumbers(
    input.body.selectedPages,
    input.body.selected_pages,
    input.body.pageNumbers
  );

  if (fromBody.length > 0) {
    if (fromBody.length > MAX_ANALYSIS_BATCH_PAGES) {
      return { pages: [], error: ANALYSIS_ERRORS.tooManyPages };
    }
    return { pages: fromBody };
  }

  if (input.body.pageRangeInput?.trim()) {
    const parsed = parsePageRanges(input.body.pageRangeInput, {
      maxPage,
      maxSelected: MAX_ANALYSIS_BATCH_PAGES,
    });
    if (parsed.error) {
      return { pages: [], error: parsed.error };
    }
    if (parsed.pages.length > 0) {
      return { pages: parsed.pages };
    }
  }

  if (input.body.preset) {
    const pageCountForPreset = maxPage ?? MAX_ANALYSIS_BATCH_PAGES;
    const fromPreset = resolvePagePreset({
      preset: input.body.preset,
      pageCount: pageCountForPreset,
      selectedPages: [],
      documentPages: input.documentPages,
      documentId: input.documentId,
    });
    if (fromPreset.length > 0) {
      return { pages: fromPreset };
    }
  }

  return {
    pages: [],
    error:
      "No drawings selected. Choose sheets from the drawing register or apply a quick filter.",
  };
}
