import type { SupabaseClient } from "@supabase/supabase-js";

import { downloadDocumentBytes } from "@/src/lib/ai-review/document-analysis/document-analysis-db";
import { getPdfPageCount, isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import { isMissingColumnError } from "@/src/lib/auth/profile-schema";

export type SeedDrawingRegisterResult = {
  ok: boolean;
  pageCount?: number;
  seededCount?: number;
  error?: string;
  skipReason?: string;
};

export async function seedDrawingRegisterForDocument(
  supabase: SupabaseClient,
  input: {
    organisationId: string;
    projectId: string;
    documentId: string;
    storagePath: string;
    fileType: string;
  }
): Promise<SeedDrawingRegisterResult> {
  if (!isPdfMimeType(input.fileType)) {
    return { ok: true, pageCount: 1, seededCount: 0, skipReason: "not_pdf" };
  }

  if (!input.storagePath.trim()) {
    return { ok: false, error: "Document storage path is missing." };
  }

  const downloaded = await downloadDocumentBytes(supabase, input.storagePath.trim());
  if ("error" in downloaded) {
    return { ok: false, error: downloaded.error };
  }

  let pageCount: number;
  try {
    pageCount = await getPdfPageCount(new Uint8Array(downloaded.bytes));
  } catch {
    return { ok: false, error: "Could not read PDF page count." };
  }

  if (pageCount < 1) {
    return { ok: false, error: "PDF has no pages." };
  }

  const { error: docUpdateError } = await supabase
    .from("documents")
    .update({ page_count: pageCount })
    .eq("id", input.documentId)
    .eq("organisation_id", input.organisationId)
    .eq("project_id", input.projectId);

  if (docUpdateError && !isMissingColumnError(docUpdateError.message)) {
    console.warn("[drawing-register] page_count update failed", docUpdateError.message);
  }

  const rows = Array.from({ length: pageCount }, (_, index) => ({
    organisation_id: input.organisationId,
    project_id: input.projectId,
    document_id: input.documentId,
    page_number: index + 1,
    sheet_number: null,
    sheet_title: null,
    revision: null,
    page_type: null,
    include_in_analysis: false,
    analysis_status: "pending",
  }));

  const { error: upsertError } = await supabase.from("document_pages").upsert(rows, {
    onConflict: "document_id,page_number",
    ignoreDuplicates: false,
  });

  if (upsertError) {
    if (isMissingColumnError(upsertError.message)) {
      const legacyRows = rows.map(({ revision: _revision, ...rest }) => rest);
      const { error: legacyError } = await supabase
        .from("document_pages")
        .upsert(legacyRows, { onConflict: "document_id,page_number" });

      if (legacyError) {
        return { ok: false, error: legacyError.message };
      }
      return { ok: true, pageCount, seededCount: pageCount };
    }
    return { ok: false, error: upsertError.message };
  }

  return { ok: true, pageCount, seededCount: pageCount };
}
