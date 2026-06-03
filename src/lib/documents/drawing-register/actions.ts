"use server";

import { revalidatePath } from "next/cache";

import { seedDrawingRegisterForDocument } from "@/src/lib/documents/drawing-register/seed";
import { queryDocumentById } from "@/src/lib/documents/document-schema";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { createClient } from "@/src/lib/supabase/server";
import { isPdfMimeType } from "@/src/lib/ai-review/document-analysis/pdf";
import type { DocumentPageType } from "@/src/types/database";

export type UpdateDrawingRegisterEntryInput = {
  id: string;
  sheetNumber?: string | null;
  sheetTitle?: string | null;
  pageType?: DocumentPageType | null;
  revision?: string | null;
};

const VALID_PAGE_TYPES = new Set<string>([
  "demolition",
  "floor_plan",
  "partition",
  "ceiling",
  "schedule",
  "specification",
  "other",
]);

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

export async function seedDrawingRegisterAction(
  projectId: string,
  documentId: string
): Promise<{ error?: string; pageCount?: number; seededCount?: number }> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const document = await queryDocumentById(
    supabase,
    documentId,
    profile.organisation_id
  );

  if (!document || document.project_id !== projectId) {
    return { error: "Document not found." };
  }

  if (!isPdfMimeType(document.file_type)) {
    return { error: "Drawing register applies to PDF documents only." };
  }

  const result = await seedDrawingRegisterForDocument(supabase, {
    organisationId: profile.organisation_id,
    projectId,
    documentId,
    storagePath: document.storage_path,
    fileType: document.file_type,
  });

  if (!result.ok) {
    return { error: result.error ?? "Could not build drawing register." };
  }

  revalidateProject(projectId);
  return { pageCount: result.pageCount, seededCount: result.seededCount };
}

export async function updateDrawingRegisterEntryAction(
  projectId: string,
  input: UpdateDrawingRegisterEntryInput
): Promise<{ error?: string }> {
  const { profile } = await requireOrganisationProfile();

  if (!input.id) {
    return { error: "Register entry not found." };
  }

  if (input.pageType != null && !VALID_PAGE_TYPES.has(input.pageType)) {
    return { error: "Invalid drawing type." };
  }

  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("document_pages")
    .select("id, document_id")
    .eq("id", input.id)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }

  if (!existing) {
    return { error: "Register entry not found." };
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", existing.document_id)
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (docError) {
    return { error: docError.message };
  }

  if (!doc) {
    return { error: "Document not found." };
  }

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.sheetNumber !== undefined) {
    payload.sheet_number = input.sheetNumber?.trim() || null;
  }
  if (input.sheetTitle !== undefined) {
    payload.sheet_title = input.sheetTitle?.trim() || null;
  }
  if (input.pageType !== undefined) {
    payload.page_type = input.pageType;
  }
  if (input.revision !== undefined) {
    payload.revision = input.revision?.trim() || null;
  }

  const { error: updateError } = await supabase
    .from("document_pages")
    .update(payload)
    .eq("id", input.id)
    .eq("organisation_id", profile.organisation_id);

  if (updateError) {
    if (/column .+ does not exist/i.test(updateError.message) && input.revision !== undefined) {
      const { revision: _revision, ...withoutRevision } = payload;
      const { error: retryError } = await supabase
        .from("document_pages")
        .update(withoutRevision)
        .eq("id", input.id)
        .eq("organisation_id", profile.organisation_id);

      if (retryError) {
        return { error: retryError.message };
      }
    } else {
      return { error: updateError.message };
    }
  }

  revalidateProject(projectId);
  return {};
}

export async function seedDrawingRegisterAfterUpload(
  projectId: string,
  documentId: string,
  organisationId: string,
  storagePath: string,
  fileType: string
): Promise<void> {
  if (!isPdfMimeType(fileType)) {
    return;
  }

  const supabase = await createClient();
  const result = await seedDrawingRegisterForDocument(supabase, {
    organisationId,
    projectId,
    documentId,
    storagePath,
    fileType,
  });

  if (!result.ok) {
    console.warn("[drawing-register] seed_after_upload_failed", {
      projectId,
      documentId,
      error: result.error,
    });
  }
}
