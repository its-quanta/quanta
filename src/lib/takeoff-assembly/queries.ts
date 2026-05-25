import { createClient } from "@/src/lib/supabase/server";
import type {
  TakeoffItemAssembly,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

const ASSEMBLY_SELECT =
  "id, organisation_id, project_id, takeoff_item_id, assembly_package_id, quantity, unit, calculated_cost, calculated_sell, calculated_margin, created_at, updated_at";

const PACKAGE_EMBED_SELECT =
  "assembly_package:assembly_packages (id, name, unit, is_active)";

function parseNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function normalizeTakeoffItemAssembly(
  row: Record<string, unknown>
): TakeoffItemAssembly {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    takeoff_item_id: String(row.takeoff_item_id),
    assembly_package_id: String(row.assembly_package_id),
    quantity: parseNumber(row.quantity),
    unit: String(row.unit ?? "each"),
    calculated_cost: parseNumber(row.calculated_cost),
    calculated_sell: parseNumber(row.calculated_sell),
    calculated_margin: parseNumber(row.calculated_margin),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

function resolvePackageEmbed(
  row: Record<string, unknown>
): TakeoffItemAssemblyWithPackage["assembly_package"] | null {
  const raw = row.assembly_package;
  const pkg = Array.isArray(raw) ? raw[0] : raw;

  if (!pkg || typeof pkg !== "object") {
    return null;
  }

  const record = pkg as Record<string, unknown>;

  return {
    id: String(record.id),
    name: String(record.name ?? ""),
    unit: String(record.unit ?? "each"),
    is_active: record.is_active !== false,
  };
}

export async function getTakeoffItemAssembliesForProject(
  projectId: string,
  organisationId: string
): Promise<TakeoffItemAssemblyWithPackage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("takeoff_item_assemblies")
    .select(`${ASSEMBLY_SELECT}, ${PACKAGE_EMBED_SELECT}`)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("getTakeoffItemAssembliesForProject:", error.message);
    return [];
  }

  const results: TakeoffItemAssemblyWithPackage[] = [];

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const assemblyPackage = resolvePackageEmbed(record);

    if (!assemblyPackage) {
      continue;
    }

    results.push({
      ...normalizeTakeoffItemAssembly(record),
      assembly_package: assemblyPackage,
    });
  }

  return results;
}

export async function getTakeoffItemAssemblyByTakeoffId(
  takeoffItemId: string,
  projectId: string,
  organisationId: string
): Promise<TakeoffItemAssemblyWithPackage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("takeoff_item_assemblies")
    .select(`${ASSEMBLY_SELECT}, ${PACKAGE_EMBED_SELECT}`)
    .eq("takeoff_item_id", takeoffItemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const assemblyPackage = resolvePackageEmbed(record);

  if (!assemblyPackage) {
    return null;
  }

  return {
    ...normalizeTakeoffItemAssembly(record),
    assembly_package: assemblyPackage,
  };
}
