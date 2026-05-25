import { createClient } from "@/src/lib/supabase/server";
import type {
  AssemblyPackage,
  AssemblyPackageItem,
  AssemblyPackageWithCount,
} from "@/src/types/database";

const PACKAGE_SELECT =
  "id, organisation_id, name, description, trade, unit, default_cost_rate, default_sell_rate, default_markup_percentage, default_margin_percentage, standard_reference, specification_reference, notes, is_active, created_at, updated_at";

const ITEM_SELECT =
  "id, organisation_id, assembly_package_id, item_type, item_name, quantity_per_unit, unit, wastage_percentage, cost_rate, sell_rate, total_cost_per_unit, notes, created_at";

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

export function normalizeAssemblyPackage(
  row: Record<string, unknown>
): AssemblyPackage {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : null,
    trade: row.trade != null ? String(row.trade) : null,
    unit: String(row.unit ?? "m2"),
    default_cost_rate: parseNumber(row.default_cost_rate),
    default_sell_rate: parseNumber(row.default_sell_rate),
    default_markup_percentage:
      row.default_markup_percentage != null
        ? parseNumber(row.default_markup_percentage)
        : null,
    default_margin_percentage:
      row.default_margin_percentage != null
        ? parseNumber(row.default_margin_percentage)
        : null,
    standard_reference:
      row.standard_reference != null ? String(row.standard_reference) : null,
    specification_reference:
      row.specification_reference != null
        ? String(row.specification_reference)
        : null,
    notes: row.notes != null ? String(row.notes) : null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function normalizeAssemblyPackageItem(
  row: Record<string, unknown>
): AssemblyPackageItem {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    assembly_package_id: String(row.assembly_package_id),
    item_type: String(row.item_type ?? "material")
      .trim()
      .toLowerCase() as AssemblyPackageItem["item_type"],
    item_name: String(row.item_name ?? ""),
    quantity_per_unit: parseNumber(row.quantity_per_unit),
    unit: String(row.unit ?? "each"),
    wastage_percentage: parseNumber(row.wastage_percentage),
    cost_rate: parseNumber(row.cost_rate),
    sell_rate: row.sell_rate != null ? parseNumber(row.sell_rate) : null,
    total_cost_per_unit: parseNumber(row.total_cost_per_unit),
    notes: row.notes != null ? String(row.notes) : null,
    created_at: String(row.created_at),
  };
}

export async function getActiveAssemblyPackagesForOrganisation(
  organisationId: string
): Promise<AssemblyPackage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembly_packages")
    .select(PACKAGE_SELECT)
    .eq("organisation_id", organisationId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getActiveAssemblyPackagesForOrganisation:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeAssemblyPackage(row as Record<string, unknown>)
  );
}

export async function getAssemblyPackagesForOrganisation(
  organisationId: string
): Promise<AssemblyPackageWithCount[]> {
  const supabase = await createClient();

  const { data: packages, error } = await supabase
    .from("assembly_packages")
    .select(PACKAGE_SELECT)
    .eq("organisation_id", organisationId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getAssemblyPackagesForOrganisation:", error.message);
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from("assembly_package_items")
    .select("id, assembly_package_id")
    .eq("organisation_id", organisationId);

  if (itemsError) {
    console.error("getAssemblyPackagesForOrganisation items:", itemsError.message);
  }

  const countByPackage = new Map<string, number>();
  for (const row of items ?? []) {
    const packageId = String(row.assembly_package_id);
    countByPackage.set(packageId, (countByPackage.get(packageId) ?? 0) + 1);
  }

  return (packages ?? []).map((row) => {
    const pkg = normalizeAssemblyPackage(row as Record<string, unknown>);
    return {
      ...pkg,
      component_count: countByPackage.get(pkg.id) ?? 0,
    };
  });
}

export async function getAssemblyPackageById(
  packageId: string,
  organisationId: string
): Promise<AssemblyPackage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembly_packages")
    .select(PACKAGE_SELECT)
    .eq("id", packageId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("getAssemblyPackageById:", error.message);
    }
    return null;
  }

  return normalizeAssemblyPackage(data as Record<string, unknown>);
}

export async function getAssemblyPackageItems(
  packageId: string,
  organisationId: string
): Promise<AssemblyPackageItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembly_package_items")
    .select(ITEM_SELECT)
    .eq("assembly_package_id", packageId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAssemblyPackageItems:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeAssemblyPackageItem(row as Record<string, unknown>)
  );
}

export async function getAssemblyPackageDetail(
  packageId: string,
  organisationId: string
): Promise<{
  assemblyPackage: AssemblyPackage | null;
  items: AssemblyPackageItem[];
}> {
  const [assemblyPackage, items] = await Promise.all([
    getAssemblyPackageById(packageId, organisationId),
    getAssemblyPackageItems(packageId, organisationId),
  ]);

  return { assemblyPackage, items };
}

export async function getActiveAssemblyCount(
  organisationId: string
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("assembly_packages")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("is_active", true);

  if (error) {
    console.error("getActiveAssemblyCount:", error.message);
    return 0;
  }

  return count ?? 0;
}
