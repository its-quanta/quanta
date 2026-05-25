import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError } from "@/src/lib/auth/profile-schema";
import type {
  LabourRate,
  MaterialRate,
  SubcontractorRate,
  SupplierRate,
} from "@/src/types/database";

import { RATE_TABLES, type RateTableName } from "@/src/lib/rates/rates-schema";

const LABOUR_SELECT_FALLBACKS = [
  "id, organisation_id, name, role, unit, cost_rate, charge_rate, notes, is_active, sort_order, created_at, updated_at",
  "id, organisation_id, name, role, unit, cost_rate, charge_rate, notes, is_active, created_at, updated_at",
  "id, organisation_id, name, unit, cost_rate, charge_rate, notes, sort_order, created_at, updated_at",
  "id, organisation_id, name, unit, cost_rate, charge_rate, notes, created_at, updated_at",
  "id, organisation_id, name, cost_rate, charge_rate, created_at, updated_at",
] as const;

const MATERIAL_SELECT_FALLBACKS = [
  "id, organisation_id, name, supplier, unit, cost_rate, waste_percent, category, notes, is_active, sort_order, created_at, updated_at",
  "id, organisation_id, name, supplier, unit, cost_rate, waste_percent, category, notes, is_active, created_at, updated_at",
  "id, organisation_id, name, supplier, unit, cost_rate, waste_percent, category, sort_order, created_at, updated_at",
  "id, organisation_id, name, supplier, unit, cost_rate, waste_percent, category, created_at, updated_at",
  "id, organisation_id, name, supplier, unit, cost_rate, category, created_at, updated_at",
  "id, organisation_id, name, unit, cost_rate, created_at, updated_at",
] as const;

const SUPPLIER_SELECT_FALLBACKS = [
  "id, organisation_id, supplier, item, unit, rate, category, rate_updated_date, notes, is_active, sort_order, created_at, updated_at",
  "id, organisation_id, supplier, item_name, unit, rate, category, rate_updated_date, notes, is_active, sort_order, created_at, updated_at",
  "id, organisation_id, supplier, item_name, unit, rate, category, updated_date, notes, is_active, created_at, updated_at",
  "id, organisation_id, supplier, item, unit, rate, rate_updated_date, sort_order, created_at, updated_at",
  "id, organisation_id, supplier, item_name, unit, rate, updated_date, created_at, updated_at",
  "id, organisation_id, supplier, item, unit, rate, created_at, updated_at",
] as const;

const SUBCONTRACTOR_SELECT_FALLBACKS = [
  "id, organisation_id, trade, supplier, rate_basis, rate, notes, is_active, sort_order, created_at, updated_at",
  "id, organisation_id, trade, supplier, rate_basis, rate, notes, is_active, created_at, updated_at",
  "id, organisation_id, trade, rate_basis, rate, notes, sort_order, created_at, updated_at",
  "id, organisation_id, trade, rate_basis, rate, notes, created_at, updated_at",
  "id, organisation_id, trade, rate, created_at, updated_at",
] as const;

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

function parseIsActive(value: unknown): boolean {
  if (value === false || value === "false" || value === 0) {
    return false;
  }
  return true;
}

function parseWastePercent(row: Record<string, unknown>): number {
  if (row.waste_percent !== undefined && row.waste_percent !== null) {
    return parseNumber(row.waste_percent);
  }
  if (row.wastage_percent !== undefined && row.wastage_percent !== null) {
    return parseNumber(row.wastage_percent);
  }
  return 0;
}

export function normalizeLabourRate(row: Record<string, unknown>): LabourRate {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    name: String(row.name ?? ""),
    role: row.role != null ? String(row.role) : null,
    unit: String(row.unit ?? "hour"),
    cost_rate: parseNumber(row.cost_rate),
    charge_rate: parseNumber(row.charge_rate),
    notes: row.notes != null ? String(row.notes) : null,
    is_active: parseIsActive(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function normalizeMaterialRate(row: Record<string, unknown>): MaterialRate {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    name: String(row.name ?? ""),
    supplier: row.supplier != null ? String(row.supplier) : null,
    unit: String(row.unit ?? "each"),
    cost_rate: parseNumber(row.cost_rate),
    waste_percent: parseWastePercent(row),
    category: row.category != null ? String(row.category) : null,
    notes: row.notes != null ? String(row.notes) : null,
    is_active: parseIsActive(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function normalizeSupplierRate(row: Record<string, unknown>): SupplierRate {
  const item =
    row.item != null
      ? String(row.item)
      : row.item_name != null
        ? String(row.item_name)
        : "";

  const updatedDate =
    row.rate_updated_date != null
      ? String(row.rate_updated_date)
      : row.updated_date != null
        ? String(row.updated_date)
        : null;

  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    supplier: String(row.supplier ?? ""),
    item,
    unit: String(row.unit ?? "each"),
    rate: parseNumber(row.rate),
    category: row.category != null ? String(row.category) : null,
    rate_updated_date: updatedDate,
    notes: row.notes != null ? String(row.notes) : null,
    is_active: parseIsActive(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function normalizeSubcontractorRate(
  row: Record<string, unknown>
): SubcontractorRate {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    trade: String(row.trade ?? ""),
    supplier: row.supplier != null ? String(row.supplier) : null,
    rate_basis: String(row.rate_basis ?? "item"),
    rate: parseNumber(row.rate),
    notes: row.notes != null ? String(row.notes) : null,
    is_active: parseIsActive(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

async function runRateListQuery<T>(
  supabase: SupabaseClient,
  table: RateTableName,
  organisationId: string,
  selectFallbacks: readonly string[],
  normalize: (row: Record<string, unknown>) => T
): Promise<{ data: T[]; error: string | null }> {
  let lastError: string | null = null;

  for (const select of selectFallbacks) {
    const useSortOrder = select.includes("sort_order");

    const attemptOrder = async (withSort: boolean) => {
      let query = supabase
        .from(table)
        .select(select)
        .eq("organisation_id", organisationId);

      if (withSort && useSortOrder) {
        query = query.order("sort_order", { ascending: true });
      }

      return query.order("created_at", { ascending: true });
    };

    let result = await attemptOrder(true);

    if (
      result.error &&
      isMissingColumnError(result.error.message) &&
      useSortOrder
    ) {
      result = await attemptOrder(false);
    }

    if (!result.error) {
      const rows = (result.data ?? []) as unknown as Record<string, unknown>[];
      return { data: rows.map(normalize), error: null };
    }

    lastError = result.error.message;

    if (!isMissingColumnError(result.error.message)) {
      return { data: [], error: lastError };
    }
  }

  return { data: [], error: lastError };
}

export async function queryLabourRates(
  supabase: SupabaseClient,
  organisationId: string
): Promise<LabourRate[]> {
  const { data } = await runRateListQuery(
    supabase,
    RATE_TABLES.labour,
    organisationId,
    LABOUR_SELECT_FALLBACKS,
    normalizeLabourRate
  );
  return data;
}

export async function queryMaterialRates(
  supabase: SupabaseClient,
  organisationId: string
): Promise<MaterialRate[]> {
  const { data } = await runRateListQuery(
    supabase,
    RATE_TABLES.material,
    organisationId,
    MATERIAL_SELECT_FALLBACKS,
    normalizeMaterialRate
  );
  return data;
}

export async function querySupplierRates(
  supabase: SupabaseClient,
  organisationId: string
): Promise<SupplierRate[]> {
  const { data } = await runRateListQuery(
    supabase,
    RATE_TABLES.supplier,
    organisationId,
    SUPPLIER_SELECT_FALLBACKS,
    normalizeSupplierRate
  );
  return data;
}

export async function querySubcontractorRates(
  supabase: SupabaseClient,
  organisationId: string
): Promise<SubcontractorRate[]> {
  const { data } = await runRateListQuery(
    supabase,
    RATE_TABLES.subcontractor,
    organisationId,
    SUBCONTRACTOR_SELECT_FALLBACKS,
    normalizeSubcontractorRate
  );
  return data;
}

/** Supplier insert payload: app sends both item and item_name when possible. */
export function buildSupplierItemPayload(item: string): Record<string, string> {
  return { item, item_name: item };
}

/** Supplier date fields: app-standard rate_updated_date with updated_date fallback. */
export function buildSupplierDatePayload(
  date: string | null
): Record<string, string | null> {
  return {
    rate_updated_date: date,
    updated_date: date,
  };
}
