import { createClient } from "@/src/lib/supabase/server";
import type {
  Standard,
  StandardLink,
  StandardLinkEntityType,
  StandardLinkWithStandard,
  StandardType,
} from "@/src/types/database";

const STANDARD_SELECT =
  "id, organisation_id, reference_code, name, standard_type, trade, jurisdiction, description, notes, source_url, is_active, created_at, updated_at";

const LINK_SELECT =
  "id, organisation_id, standard_id, entity_type, entity_id, project_id, created_at";

export function normalizeStandard(row: Record<string, unknown>): Standard {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    reference_code: String(row.reference_code ?? ""),
    name: String(row.name ?? ""),
    standard_type: String(row.standard_type ?? "custom") as StandardType,
    trade: row.trade != null ? String(row.trade) : null,
    jurisdiction: row.jurisdiction != null ? String(row.jurisdiction) : null,
    description: row.description != null ? String(row.description) : null,
    notes: row.notes != null ? String(row.notes) : null,
    source_url: row.source_url != null ? String(row.source_url) : null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function normalizeStandardLink(row: Record<string, unknown>): StandardLink {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    standard_id: String(row.standard_id),
    entity_type: String(row.entity_type) as StandardLinkEntityType,
    entity_id: String(row.entity_id),
    project_id: row.project_id != null ? String(row.project_id) : null,
    created_at: String(row.created_at),
  };
}

function resolveStandardEmbed(
  row: Record<string, unknown>
): StandardLinkWithStandard["standard"] | null {
  const raw = row.standard;
  const record = Array.isArray(raw) ? raw[0] : raw;
  if (!record || typeof record !== "object") {
    return null;
  }
  return normalizeStandard(record as Record<string, unknown>);
}

export async function getStandardsForOrganisation(
  organisationId: string,
  options?: { activeOnly?: boolean }
): Promise<Standard[]> {
  const supabase = await createClient();

  let query = supabase
    .from("standards")
    .select(STANDARD_SELECT)
    .eq("organisation_id", organisationId)
    .order("reference_code", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("getStandardsForOrganisation:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeStandard(row as Record<string, unknown>)
  );
}

export async function getStandardById(
  standardId: string,
  organisationId: string
): Promise<Standard | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("standards")
    .select(STANDARD_SELECT)
    .eq("id", standardId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeStandard(data as Record<string, unknown>);
}

export async function getStandardLinksForEntity(
  entityType: StandardLinkEntityType,
  entityId: string,
  organisationId: string
): Promise<StandardLinkWithStandard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("standard_links")
    .select(`${LINK_SELECT}, standard:standards (${STANDARD_SELECT})`)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("getStandardLinksForEntity:", error.message);
    return [];
  }

  const results: StandardLinkWithStandard[] = [];

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const standard = resolveStandardEmbed(record);
    if (!standard) {
      continue;
    }
    results.push({
      ...normalizeStandardLink(record),
      standard,
    });
  }

  return results;
}

export async function getStandardLinksWithStandardsForProject(
  projectId: string,
  organisationId: string
): Promise<StandardLinkWithStandard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("standard_links")
    .select(`${LINK_SELECT}, standard:standards (${STANDARD_SELECT})`)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("getStandardLinksWithStandardsForProject:", error.message);
    return [];
  }

  const results: StandardLinkWithStandard[] = [];

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const standard = resolveStandardEmbed(record);
    if (!standard) {
      continue;
    }
    results.push({
      ...normalizeStandardLink(record),
      standard,
    });
  }

  return results;
}

export async function getStandardLinksForProject(
  projectId: string,
  organisationId: string
): Promise<StandardLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("standard_links")
    .select(LINK_SELECT)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId);

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("getStandardLinksForProject:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeStandardLink(row as Record<string, unknown>)
  );
}

export async function getActiveStandardCount(
  organisationId: string
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("standards")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("is_active", true);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
