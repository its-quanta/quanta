import { createClient } from "@/src/lib/supabase/server";
import type {
  ProjectLabourItem,
  ProjectMaterialItem,
} from "@/src/types/database";

const MATERIAL_SELECT =
  "id, organisation_id, project_id, takeoff_item_id, assembly_package_id, source_package_name, material_name, quantity, unit, cost_rate, total_cost, wastage_percent, supplier, pricing_source, reviewed, created_at";

const LABOUR_SELECT =
  "id, organisation_id, project_id, takeoff_item_id, assembly_package_id, source_package_name, labour_name, hours, unit, cost_rate, charge_rate, total_cost, total_sell, pricing_source, reviewed, created_at";

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

function normalizePricingSource(raw: unknown): ProjectMaterialItem["pricing_source"] {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "manual") {
    return "manual";
  }
  if (value === "assembly" || value === "assembly_package") {
    return "assembly";
  }
  return "assembly";
}

export function normalizeProjectMaterialItem(
  row: Record<string, unknown>
): ProjectMaterialItem {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    takeoff_item_id: String(row.takeoff_item_id),
    assembly_package_id: String(row.assembly_package_id),
    source_package_name: String(row.source_package_name ?? ""),
    material_name: String(row.material_name ?? ""),
    quantity: parseNumber(row.quantity),
    unit: String(row.unit ?? "each"),
    cost_rate: parseNumber(row.cost_rate),
    total_cost: parseNumber(row.total_cost),
    wastage_percent: parseNumber(row.wastage_percent),
    supplier: row.supplier != null ? String(row.supplier) : null,
    pricing_source: normalizePricingSource(row.pricing_source),
    reviewed: row.reviewed === true,
    created_at: String(row.created_at),
  };
}

export function normalizeProjectLabourItem(
  row: Record<string, unknown>
): ProjectLabourItem {
  return {
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    project_id: String(row.project_id),
    takeoff_item_id: String(row.takeoff_item_id),
    assembly_package_id: String(row.assembly_package_id),
    source_package_name: String(row.source_package_name ?? ""),
    labour_name: String(row.labour_name ?? ""),
    hours: parseNumber(row.hours),
    unit: String(row.unit ?? "hr"),
    cost_rate: parseNumber(row.cost_rate),
    charge_rate: parseNumber(row.charge_rate),
    total_cost: parseNumber(row.total_cost),
    total_sell: parseNumber(row.total_sell),
    pricing_source: normalizePricingSource(row.pricing_source),
    reviewed: row.reviewed === true,
    created_at: String(row.created_at),
  };
}

export type ProjectEstimateQueryResult = {
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  loadError: string | null;
};

export async function getProjectEstimateItems(
  projectId: string,
  organisationId: string
): Promise<ProjectEstimateQueryResult> {
  const supabase = await createClient();

  const [materialsResult, labourResult] = await Promise.all([
    supabase
      .from("project_material_items")
      .select(MATERIAL_SELECT)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_labour_items")
      .select(LABOUR_SELECT)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true }),
  ]);

  const errors: string[] = [];

  if (materialsResult.error) {
    if (/relation .+ does not exist/i.test(materialsResult.error.message)) {
      errors.push(
        "Materials table not found. Run migration 20260526200000_project_material_labour_items.sql."
      );
    } else {
      console.error("getProjectMaterialItems:", materialsResult.error.message);
      errors.push(`Materials: ${materialsResult.error.message}`);
    }
  }

  if (labourResult.error) {
    if (/relation .+ does not exist/i.test(labourResult.error.message)) {
      errors.push(
        "Labour table not found. Run migration 20260526200000_project_material_labour_items.sql."
      );
    } else {
      console.error("getProjectLabourItems:", labourResult.error.message);
      errors.push(`Labour: ${labourResult.error.message}`);
    }
  }

  return {
    materialItems: (materialsResult.data ?? []).map((row) =>
      normalizeProjectMaterialItem(row as Record<string, unknown>)
    ),
    labourItems: (labourResult.data ?? []).map((row) =>
      normalizeProjectLabourItem(row as Record<string, unknown>)
    ),
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

/** @deprecated Use getProjectEstimateItems */
export async function getProjectMaterialItems(
  projectId: string,
  organisationId: string
): Promise<ProjectMaterialItem[]> {
  const { materialItems } = await getProjectEstimateItems(
    projectId,
    organisationId
  );
  return materialItems;
}

/** @deprecated Use getProjectEstimateItems */
export async function getProjectLabourItems(
  projectId: string,
  organisationId: string
): Promise<ProjectLabourItem[]> {
  const { labourItems } = await getProjectEstimateItems(
    projectId,
    organisationId
  );
  return labourItems;
}
