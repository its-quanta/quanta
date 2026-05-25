import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError } from "@/src/lib/auth/profile-schema";
import type { DocumentPage } from "@/src/types/database";

export const DOCUMENT_PAGE_SELECT =
  "id, organisation_id, document_id, page_number, sheet_number, sheet_title, created_at, updated_at" as const;

export type DocumentPageRow = {
  id: string;
  organisation_id: string;
  document_id: string;
  page_number: number;
  sheet_number: string | null;
  sheet_title: string | null;
  created_at: string;
  updated_at?: string;
};

export function normalizeDocumentPage(row: DocumentPageRow): DocumentPage {
  return {
    id: row.id,
    organisation_id: row.organisation_id,
    document_id: row.document_id,
    page_number: Number(row.page_number),
    sheet_number: row.sheet_number ?? null,
    sheet_title: row.sheet_title ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function queryDocumentPagesForProject(
  supabase: SupabaseClient,
  projectId: string,
  organisationId: string
): Promise<DocumentPage[]> {
  const { data, error } = await supabase
    .from("document_pages")
    .select(DOCUMENT_PAGE_SELECT)
    .eq("organisation_id", organisationId)
    .order("page_number", { ascending: true });

  if (error) {
    if (isMissingColumnError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DocumentPageRow[];

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
