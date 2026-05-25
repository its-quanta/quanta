"use client";

import {
  buildStoragePath,
  PROJECT_DOCUMENTS_BUCKET,
  resolveDocumentMimeType,
  validateDocumentFile,
} from "@/src/lib/documents/constants";
import { createClient } from "@/src/lib/supabase/client";

export type ClientDocumentUploadResult =
  | { ok: true; storagePath: string; fileType: string }
  | { ok: false; error: string };

export async function uploadDocumentFileToStorage(
  file: File,
  organisationId: string,
  projectId: string
): Promise<ClientDocumentUploadResult> {
  const validationError = validateDocumentFile(file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const storagePath = buildStoragePath(organisationId, projectId, file.name);
  const fileType = resolveDocumentMimeType(file);
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: fileType,
      upsert: false,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, storagePath, fileType };
}

export async function removeDocumentFromStorage(
  storagePath: string
): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
}
