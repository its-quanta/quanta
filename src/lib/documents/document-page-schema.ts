import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError } from "@/src/lib/auth/profile-schema";
import type { DocumentPage } from "@/src/types/database";

export const DOCUMENT_PAGE_SELECT =
  "id, organisation_id, project_id, document_id, page_number, sheet_number, sheet_title, revision, page_label, page_type, include_in_analysis, analysis_status, created_at, updated_at" as const;

export const DOCUMENT_PAGE_SELECT_LEGACY =
  "id, organisation_id, document_id, page_number, sheet_number, sheet_title, created_at, updated_at" as const;

export type DocumentPageRow = {
  id: string;
  organisation_id: string;
  project_id?: string | null;
  document_id: string;
  page_number: number;
  sheet_number: string | null;
  sheet_title: string | null;
  revision?: string | null;
  page_label?: string | null;
  page_type?: string | null;
  include_in_analysis?: boolean | null;
  analysis_status?: string | null;
  created_at: string;
  updated_at?: string;
};

export function normalizeDocumentPage(row: DocumentPageRow): DocumentPage {
  return {
    id: row.id,
    organisation_id: row.organisation_id,
    project_id: row.project_id ?? null,
    document_id: row.document_id,
    page_number: Number(row.page_number),
    sheet_number: row.sheet_number ?? null,
    sheet_title: row.sheet_title ?? null,
    revision: row.revision ?? null,
    page_label: row.page_label ?? null,
    page_type: (row.page_type as DocumentPage["page_type"]) ?? null,
    include_in_analysis: row.include_in_analysis ?? true,
    analysis_status: row.analysis_status ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function queryDocumentPagesForProject(
  supabase: SupabaseClient,
  projectId: string,
  organisationId: string
): Promise<DocumentPage[]> {
  const primary = await supabase
    .from("document_pages")
    .select(DOCUMENT_PAGE_SELECT)
    .eq("organisation_id", organisationId)
    .order("page_number", { ascending: true });

  let rows: DocumentPageRow[] = [];

  if (primary.error && isMissingColumnError(primary.error.message)) {
    const legacy = await supabase
      .from("document_pages")
      .select(DOCUMENT_PAGE_SELECT_LEGACY)
      .eq("organisation_id", organisationId)
      .order("page_number", { ascending: true });

    if (legacy.error) {
      if (isMissingColumnError(legacy.error.message)) {
        return [];
      }
      throw new Error(legacy.error.message);
    }

    rows = (legacy.data ?? []) as DocumentPageRow[];
  } else if (primary.error) {
    if (isMissingColumnError(primary.error.message)) {
      return [];
    }
    throw new Error(primary.error.message);
  } else {
    rows = (primary.data ?? []) as DocumentPageRow[];
  }

  const documentIds = new Set(
    (
      await supabase
        .from("documents")
        .select("id")
        .eq("project_id", projectId)
        .eq("organisation_id", organisationId)
    ).data?.map((row) => String((row as { id: string }).id)) ?? []
  );

  return rows
    .filter((row) => documentIds.has(row.document_id))
    .map(normalizeDocumentPage);
}
