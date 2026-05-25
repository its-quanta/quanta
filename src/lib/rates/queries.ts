import { isMissingColumnError } from "@/src/lib/auth/profile-schema";
import { createClient } from "@/src/lib/supabase/server";
import {
  OUTDATED_SUPPLIER_RATE_DAYS,
  RECENT_RATE_CHANGE_DAYS,
} from "@/src/lib/rates/constants";
import {
  normalizeLabourRate,
  normalizeMaterialRate,
  normalizeSubcontractorRate,
  normalizeSupplierRate,
  queryLabourRates,
  queryMaterialRates,
  querySubcontractorRates,
  querySupplierRates,
} from "@/src/lib/rates/rates-query-schema";
import {
  mapRateMutationError,
  RATE_TABLES,
  type RateTableName,
} from "@/src/lib/rates/rates-schema";
import type { RateLibraryKind, RecentRateChange } from "@/src/types/database";

export type RateLibrarySummary = {
  labourCount: number;
  materialCount: number;
  supplierCount: number;
  outdatedSupplierCount: number;
  recentChanges: RecentRateChange[];
};

const KIND_LABELS: Record<RateLibraryKind, string> = {
  labour: "Labour",
  material: "Material",
  supplier: "Supplier",
  subcontractor: "Subcontractor",
};

function logRateQueryError(table: RateTableName, message: string): void {
  console.error(
    `getRateLibraries (${table}):`,
    mapRateMutationError(table, message)
  );
}

function outdatedSupplierCutoff(): string {
  const date = new Date();
  date.setDate(date.getDate() - OUTDATED_SUPPLIER_RATE_DAYS);
  return date.toISOString().slice(0, 10);
}

function recentChangeCutoff(): string {
  const date = new Date();
  date.setDate(date.getDate() - RECENT_RATE_CHANGE_DAYS);
  return date.toISOString();
}

async function countOutdatedSupplierRates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organisationId: string,
  cutoffDate: string
): Promise<number> {
  const attempts = [
    () =>
      supabase
        .from(RATE_TABLES.supplier)
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", organisationId)
        .or(`rate_updated_date.is.null,rate_updated_date.lt.${cutoffDate}`),
    () =>
      supabase
        .from(RATE_TABLES.supplier)
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", organisationId)
        .or(`updated_date.is.null,updated_date.lt.${cutoffDate}`),
  ];

  for (const run of attempts) {
    const { count, error } = await run();
    if (!error) {
      return count ?? 0;
    }
    if (!isMissingColumnError(error.message)) {
      logRateQueryError(RATE_TABLES.supplier, error.message);
      return 0;
    }
  }

  return 0;
}

export async function getLabourRatesForOrganisation(organisationId: string) {
  const supabase = await createClient();
  return queryLabourRates(supabase, organisationId);
}

export async function getMaterialRatesForOrganisation(organisationId: string) {
  const supabase = await createClient();
  return queryMaterialRates(supabase, organisationId);
}

export async function getSupplierRatesForOrganisation(organisationId: string) {
  const supabase = await createClient();
  return querySupplierRates(supabase, organisationId);
}

export async function getSubcontractorRatesForOrganisation(organisationId: string) {
  const supabase = await createClient();
  return querySubcontractorRates(supabase, organisationId);
}

function buildRateLibrarySummary(
  labourRates: Awaited<ReturnType<typeof queryLabourRates>>,
  materialRates: Awaited<ReturnType<typeof queryMaterialRates>>,
  supplierRates: Awaited<ReturnType<typeof querySupplierRates>>,
  subcontractorRates: Awaited<ReturnType<typeof querySubcontractorRates>>,
  outdatedSupplierCount: number
): RateLibrarySummary {
  const recentCutoff = recentChangeCutoff();
  const recentChanges: RecentRateChange[] = [];

  for (const rate of labourRates) {
    if (rate.updated_at >= recentCutoff) {
      recentChanges.push({
        id: rate.id,
        kind: "labour",
        label: rate.name,
        detail: rate.role ?? KIND_LABELS.labour,
        updated_at: rate.updated_at,
      });
    }
  }

  for (const rate of materialRates) {
    if (rate.updated_at >= recentCutoff) {
      recentChanges.push({
        id: rate.id,
        kind: "material",
        label: rate.name,
        detail: KIND_LABELS.material,
        updated_at: rate.updated_at,
      });
    }
  }

  for (const rate of supplierRates) {
    if (rate.updated_at >= recentCutoff) {
      recentChanges.push({
        id: rate.id,
        kind: "supplier",
        label: `${rate.supplier} — ${rate.item}`,
        detail: KIND_LABELS.supplier,
        updated_at: rate.updated_at,
      });
    }
  }

  for (const rate of subcontractorRates) {
    if (rate.updated_at >= recentCutoff) {
      recentChanges.push({
        id: rate.id,
        kind: "subcontractor",
        label: rate.trade,
        detail: rate.supplier ?? KIND_LABELS.subcontractor,
        updated_at: rate.updated_at,
      });
    }
  }

  recentChanges.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return {
    labourCount: labourRates.length,
    materialCount: materialRates.length,
    supplierCount: supplierRates.length,
    outdatedSupplierCount,
    recentChanges: recentChanges.slice(0, 10),
  };
}

export async function getRateLibrarySummary(
  organisationId: string
): Promise<RateLibrarySummary> {
  const supabase = await createClient();
  const cutoffDate = outdatedSupplierCutoff();

  const [labourRates, materialRates, supplierRates, subcontractorRates, outdatedSupplierCount] =
    await Promise.all([
      queryLabourRates(supabase, organisationId),
      queryMaterialRates(supabase, organisationId),
      querySupplierRates(supabase, organisationId),
      querySubcontractorRates(supabase, organisationId),
      countOutdatedSupplierRates(supabase, organisationId, cutoffDate),
    ]);

  return buildRateLibrarySummary(
    labourRates,
    materialRates,
    supplierRates,
    subcontractorRates,
    outdatedSupplierCount
  );
}

export async function getRateLibrariesForOrganisation(organisationId: string) {
  const supabase = await createClient();
  const cutoffDate = outdatedSupplierCutoff();

  const [
    labourRates,
    materialRates,
    supplierRates,
    subcontractorRates,
    outdatedSupplierCount,
  ] = await Promise.all([
    queryLabourRates(supabase, organisationId),
    queryMaterialRates(supabase, organisationId),
    querySupplierRates(supabase, organisationId),
    querySubcontractorRates(supabase, organisationId),
    countOutdatedSupplierRates(supabase, organisationId, cutoffDate),
  ]);

  const summary = buildRateLibrarySummary(
    labourRates,
    materialRates,
    supplierRates,
    subcontractorRates,
    outdatedSupplierCount
  );

  return {
    labourRates,
    materialRates,
    supplierRates,
    subcontractorRates,
    summary,
  };
}
