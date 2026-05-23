import { createClient } from "@/src/lib/supabase/server";
import {
  queryProjectById,
  queryProjectsForOrganisation,
} from "@/src/lib/projects/project-schema";
import type { Project } from "@/src/types/database";

export async function getProjectsForOrganisation(
  organisationId: string,
  limit?: number
): Promise<Project[]> {
  const supabase = await createClient();
  return queryProjectsForOrganisation(supabase, organisationId, limit);
}

export async function getProjectById(
  projectId: string
): Promise<Project | null> {
  const supabase = await createClient();
  return queryProjectById(supabase, projectId);
}
