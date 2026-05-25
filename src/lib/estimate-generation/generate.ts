import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeAssemblyPackageItem } from "@/src/lib/assemblies/queries";
import {
  computeLabourHours,
  computeLineCost,
  computeMaterialQuantity,
} from "@/src/lib/estimate-generation/calculations";
import type { AssemblyPackage, AssemblyPackageItem } from "@/src/types/database";

const ASSEMBLY_ITEM_SELECT =
  "id, organisation_id, assembly_package_id, item_type, item_name, quantity_per_unit, unit, wastage_percentage, cost_rate, sell_rate, total_cost_per_unit, notes, created_at";

const PRICING_SOURCE_ASSEMBLY = "assembly";
const PRICING_SOURCE_ASSEMBLY_LEGACY = "assembly_package";

function isMissingTableError(message: string): boolean {
  return /relation .+ does not exist/i.test(message);
}

function isPricingSourceEnumError(message: string): boolean {
  return /estimate_pricing_source|invalid input value for enum/i.test(message);
}

function normalizeItemType(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function logEstimateDev(message: string, detail?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[estimate-generation] ${message}`, detail ?? "");
  }
}

export async function fetchAssemblyPackageComponents(
  supabase: SupabaseClient,
  assemblyPackageId: string,
  organisationId: string
): Promise<{ items: AssemblyPackageItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("assembly_package_items")
    .select(ASSEMBLY_ITEM_SELECT)
    .eq("assembly_package_id", assemblyPackageId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    logEstimateDev("fetchAssemblyPackageComponents failed", error);
    return { items: [], error: error.message };
  }

  const items = (data ?? []).map((row) =>
    normalizeAssemblyPackageItem(row as Record<string, unknown>)
  );

  if (process.env.NODE_ENV === "development") {
    console.error(
      `[estimate-generation] Loaded ${items.length} component(s) for package ${assemblyPackageId}`,
      items.map((item) => ({
        type: normalizeItemType(item.item_type),
        name: item.item_name,
      }))
    );
  }

  return { items, error: null };
}

async function insertWithPricingSourceFallback(
  supabase: SupabaseClient,
  table: "project_material_items" | "project_labour_items",
  rows: Record<string, unknown>[]
): Promise<{ error: string | null }> {
  if (rows.length === 0) {
    return { error: null };
  }

  const withAssembly = rows.map((row) => ({
    ...row,
    pricing_source: PRICING_SOURCE_ASSEMBLY,
  }));

  let { error } = await supabase.from(table).insert(withAssembly);

  if (error && isPricingSourceEnumError(error.message)) {
    logEstimateDev(
      `insert ${table}: retrying with pricing_source assembly_package`,
      error.message
    );
    const withLegacy = rows.map((row) => ({
      ...row,
      pricing_source: PRICING_SOURCE_ASSEMBLY_LEGACY,
    }));
    ({ error } = await supabase.from(table).insert(withLegacy));
  }

  if (error) {
    logEstimateDev(`insert ${table} failed`, {
      message: error.message,
      details: error.details,
      hint: error.hint,
      rowCount: rows.length,
    });
    return { error: error.message };
  }

  return { error: null };
}

export async function clearGeneratedEstimateForTakeoff(
  supabase: SupabaseClient,
  takeoffItemId: string,
  projectId: string,
  organisationId: string,
  assemblyPackageId?: string
): Promise<{ error: string | null }> {
  const scope: Record<string, string> = {
    takeoff_item_id: takeoffItemId,
    project_id: projectId,
    organisation_id: organisationId,
  };

  let materialQuery = supabase.from("project_material_items").delete().match(scope);
  let labourQuery = supabase.from("project_labour_items").delete().match(scope);

  if (assemblyPackageId) {
    materialQuery = materialQuery.eq("assembly_package_id", assemblyPackageId);
    labourQuery = labourQuery.eq("assembly_package_id", assemblyPackageId);
  }

  const { error: materialError } = await materialQuery;

  if (materialError) {
    if (isMissingTableError(materialError.message)) {
      return {
        error:
          "Materials generation is not available yet. Run migration supabase/migrations/20260526200000_project_material_labour_items.sql.",
      };
    }
    return { error: materialError.message };
  }

  const { error: labourError } = await labourQuery;

  if (labourError) {
    if (isMissingTableError(labourError.message)) {
      return {
        error:
          "Labour generation is not available yet. Run migration supabase/migrations/20260526200000_project_material_labour_items.sql.",
      };
    }
    return { error: labourError.message };
  }

  return { error: null };
}

export async function regenerateEstimateForTakeoff(
  supabase: SupabaseClient,
  params: {
    organisationId: string;
    projectId: string;
    takeoffItemId: string;
    takeoffQuantity: number;
    assemblyPackage: AssemblyPackage;
  }
): Promise<{
  error: string | null;
  materialCount: number;
  labourCount: number;
  componentCount: number;
}> {
  const {
    organisationId,
    projectId,
    takeoffItemId,
    takeoffQuantity,
    assemblyPackage,
  } = params;

  const cleared = await clearGeneratedEstimateForTakeoff(
    supabase,
    takeoffItemId,
    projectId,
    organisationId,
    assemblyPackage.id
  );

  if (cleared.error) {
    return {
      error: cleared.error,
      materialCount: 0,
      labourCount: 0,
      componentCount: 0,
    };
  }

  const { items: components, error: componentsError } =
    await fetchAssemblyPackageComponents(
      supabase,
      assemblyPackage.id,
      organisationId
    );

  if (componentsError) {
    return {
      error: `Could not load package components: ${componentsError}`,
      materialCount: 0,
      labourCount: 0,
      componentCount: 0,
    };
  }

  if (components.length === 0) {
    return {
      error: null,
      materialCount: 0,
      labourCount: 0,
      componentCount: 0,
    };
  }

  const materialRows: Record<string, unknown>[] = [];
  const labourRows: Record<string, unknown>[] = [];

  for (const component of components) {
    const itemType = normalizeItemType(component.item_type);

    if (itemType === "material") {
      const quantity = computeMaterialQuantity(
        takeoffQuantity,
        component.quantity_per_unit,
        component.wastage_percentage
      );
      const totalCost = computeLineCost(quantity, component.cost_rate);

      materialRows.push({
        organisation_id: organisationId,
        project_id: projectId,
        takeoff_item_id: takeoffItemId,
        assembly_package_id: assemblyPackage.id,
        source_package_name: assemblyPackage.name,
        material_name: component.item_name,
        quantity,
        unit: component.unit,
        cost_rate: component.cost_rate,
        total_cost: totalCost,
        wastage_percent: component.wastage_percentage,
        supplier: null,
        reviewed: false,
      });
      continue;
    }

    if (itemType === "labour") {
      const hours = computeLabourHours(
        takeoffQuantity,
        component.quantity_per_unit
      );
      const chargeRate = component.sell_rate ?? 0;
      const totalCost = computeLineCost(hours, component.cost_rate);
      const totalSell = computeLineCost(hours, chargeRate);

      labourRows.push({
        organisation_id: organisationId,
        project_id: projectId,
        takeoff_item_id: takeoffItemId,
        assembly_package_id: assemblyPackage.id,
        source_package_name: assemblyPackage.name,
        labour_name: component.item_name,
        hours,
        unit: component.unit,
        cost_rate: component.cost_rate,
        charge_rate: chargeRate,
        total_cost: totalCost,
        total_sell: totalSell,
        reviewed: false,
      });
    }
  }

  if (materialRows.length > 0) {
    const inserted = await insertWithPricingSourceFallback(
      supabase,
      "project_material_items",
      materialRows
    );

    if (inserted.error) {
      return {
        error: `Could not save generated materials: ${inserted.error}`,
        materialCount: 0,
        labourCount: 0,
        componentCount: components.length,
      };
    }
  }

  if (labourRows.length > 0) {
    const inserted = await insertWithPricingSourceFallback(
      supabase,
      "project_labour_items",
      labourRows
    );

    if (inserted.error) {
      return {
        error: `Could not save generated labour: ${inserted.error}`,
        materialCount: materialRows.length,
        labourCount: 0,
        componentCount: components.length,
      };
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.error(
      `[estimate-generation] Generated ${materialRows.length} material and ${labourRows.length} labour row(s) for takeoff ${takeoffItemId}`
    );
  }

  return {
    error: null,
    materialCount: materialRows.length,
    labourCount: labourRows.length,
    componentCount: components.length,
  };
}
