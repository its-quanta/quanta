import { createClient } from "@/src/lib/supabase/server";
import {
  queryDocumentById,
  queryDocumentsForProject,
} from "@/src/lib/documents/document-schema";
import type { Document } from "@/src/types/database";

export async function getDocumentsForProject(
  projectId: string,
  organisationId: string
): Promise<Document[]> {
  const supabase = await createClient();
  return queryDocumentsForProject(supabase, projectId, organisationId);
}

export async function getDocumentById(
  documentId: string,
  organisationId: string
): Promise<Document | null> {
  const supabase = await createClient();
  return queryDocumentById(supabase, documentId, organisationId);
}
