import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError } from "@/src/lib/auth/profile-schema";
import type { Project, ProjectStatus } from "@/src/types/database";

/** Baseline columns present on the earliest deployed projects tables. */
export const PROJECT_MINIMAL_SELECT =
  "id, organisation_id, name, client_name, status, created_by, created_at, updated_at" as const;

/** Standard workflow fields before extended metadata columns. */
export const PROJECT_STANDARD_SELECT =
  `${PROJECT_MINIMAL_SELECT}, tender_due_date, notes` as const;

/** Full schema including optional metadata columns. */
export const PROJECT_EXTENDED_SELECT =
  `${PROJECT_STANDARD_SELECT}, site_address, project_type, trade_scope, estimated_value` as const;

const PROJECT_SELECT_FALLBACKS = [
  PROJECT_EXTENDED_SELECT,
  PROJECT_STANDARD_SELECT,
  PROJECT_MINIMAL_SELECT,
] as const;

export type ProjectRow = {
  id: string;
  organisation_id: string;
  name: string;
  client_name: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tender_due_date?: string | null;
  notes?: string | null;
  site_address?: string | null;
  project_type?: string | null;
  trade_scope?: string | null;
  estimated_value?: number | null;
};

export function normalizeProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organisation_id: row.organisation_id,
    name: row.name,
    client_name: row.client_name ?? null,
    site_address: row.site_address ?? null,
    project_type: row.project_type ?? null,
    trade_scope: row.trade_scope ?? null,
    tender_due_date: row.tender_due_date ?? null,
    status: row.status ?? "draft",
    notes: row.notes ?? null,
    estimated_value: row.estimated_value ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type SupabaseQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

async function queryWithProjectSelectFallback<T>(
  run: (select: string) => Promise<SupabaseQueryResult>
): Promise<{ data: T; error: string | null }> {
  let lastError: string | null = null;

  for (const select of PROJECT_SELECT_FALLBACKS) {
    const { data, error } = await run(select);

    if (!error) {
      return { data: data as T, error: null };
    }

    lastError = error.message;

    if (!isMissingColumnError(error.message)) {
      return { data: data as T, error: error.message };
    }
  }

  return { data: null as T, error: lastError };
}

async function queryProjects(
  supabase: SupabaseClient,
  organisationId: string,
  limit?: number
): Promise<{ rows: ProjectRow[]; error: string | null }> {
  const { data, error } = await queryWithProjectSelectFallback<ProjectRow[] | null>(
    async (select) => {
      let query = supabase
        .from("projects")
        .select(select)
        .eq("organisation_id", organisationId)
        .order("updated_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      return query;
    }
  );

  if (error) {
    return { rows: [], error };
  }

  return { rows: data ?? [], error: null };
}

export async function queryProjectsForOrganisation(
  supabase: SupabaseClient,
  organisationId: string,
  limit?: number
): Promise<Project[]> {
  const { rows, error } = await queryProjects(supabase, organisationId, limit);

  if (error) {
    throw new Error(error);
  }

  return rows.map(normalizeProject);
}

export async function queryProjectById(
  supabase: SupabaseClient,
  projectId: string
): Promise<Project | null> {
  const { data, error } = await queryWithProjectSelectFallback<ProjectRow | null>(
    async (select) =>
      supabase
        .from("projects")
        .select(select)
        .eq("id", projectId)
        .maybeSingle()
  );

  if (error) {
    throw new Error(error);
  }

  return data ? normalizeProject(data) : null;
}

export async function insertProjectWithFallback(
  supabase: SupabaseClient,
  payloads: {
    extended: Record<string, unknown>;
    standard: Record<string, unknown>;
    minimal: Record<string, unknown>;
  }
): Promise<{ error: string | null }> {
  const attempts = [payloads.extended, payloads.standard, payloads.minimal];
  let lastError: string | null = null;

  for (const payload of attempts) {
    const { error } = await supabase.from("projects").insert(payload);

    if (!error) {
      return { error: null };
    }

    lastError = error.message;

    if (!isMissingColumnError(error.message)) {
      return { error: error.message };
    }
  }

  return { error: lastError };
}
