import { createClient } from "@/src/lib/supabase/server";
import type { Organisation } from "@/src/types/database";

const ORGANISATION_COLUMNS =
  "id, name, country, currency, tax_rate, default_margin_percentage, default_markup_percentage, default_labour_cost_rate, default_labour_charge_rate, created_at, updated_at";

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapOrganisationRow(row: Record<string, unknown>): Organisation {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    country: (row.country as Organisation["country"]) ?? null,
    currency: (row.currency as Organisation["currency"]) ?? null,
    tax_rate: parseOptionalNumber(row.tax_rate),
    default_margin_percentage: parseOptionalNumber(row.default_margin_percentage),
    default_markup_percentage: parseOptionalNumber(row.default_markup_percentage),
    default_labour_cost_rate: parseOptionalNumber(row.default_labour_cost_rate),
    default_labour_charge_rate: parseOptionalNumber(
      row.default_labour_charge_rate
    ),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getOrganisationById(
  organisationId: string
): Promise<Organisation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organisations")
    .select(ORGANISATION_COLUMNS)
    .eq("id", organisationId)
    .maybeSingle();

  if (error) {
    console.error("getOrganisationById:", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapOrganisationRow(data as Record<string, unknown>);
}
