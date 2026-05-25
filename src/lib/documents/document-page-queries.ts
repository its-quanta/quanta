import { createClient } from "@/src/lib/supabase/server";
import { queryDocumentPagesForProject } from "@/src/lib/documents/document-page-schema";
import type { DocumentPage } from "@/src/types/database";

export async function getDocumentPagesForProject(
  projectId: string,
  organisationId: string
): Promise<DocumentPage[]> {
  const supabase = await createClient();
  return queryDocumentPagesForProject(supabase, projectId, organisationId);
}
