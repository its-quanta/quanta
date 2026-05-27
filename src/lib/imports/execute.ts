"use server";

import { revalidatePath } from "next/cache";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import {
  getNextRateSortOrder,
  insertRateRow,
  RATE_TABLES,
  updateRateRow,
} from "@/src/lib/rates/rates-schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  DuplicateStrategy,
  ImportExecutionResult,
  ImportRowFailure,
  ImportType,
} from "@/src/lib/imports/types";

export type ExecuteImportInput = {
  importType: ImportType;
  duplicateStrategy: DuplicateStrategy;
  rows: Record<string, string>[];
};

function trimOptional(value: string | undefined): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function parseNumber(value: string | undefined, fallback = 0): number {
  const cleaned = value?.replace(/,/g, "").trim() ?? "";
  if (!cleaned) {
    return fallback;
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function rowSnapshot(row: Record<string, string>): string {
  return JSON.stringify(row);
}

async function recordImportBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organisationId: string,
  userId: string,
  importType: ImportType,
  duplicateStrategy: DuplicateStrategy,
  imported: number,
  failed: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      organisation_id: organisationId,
      import_type: importType,
      rows_imported: imported,
      rows_failed: failed,
      duplicate_strategy: duplicateStrategy,
      imported_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    return null;
  }

  return data ? String(data.id) : null;
}

async function executeLabourImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from(RATE_TABLES.labour)
    .select("id, name")
    .eq("organisation_id", organisationId);

  const existingByName = new Map(
    (existingRows ?? []).map((row) => [
      String(row.name).trim().toLowerCase(),
      String(row.id),
    ])
  );

  let sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.labour,
    organisationId
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const name = row.name?.trim();

    if (!name) {
      failures.push({
        rowNumber,
        reason: "Name is required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const key = name.toLowerCase();
    const existingId = existingByName.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const payload = {
      organisation_id: organisationId,
      name,
      role: trimOptional(row.role),
      unit: trimOptional(row.unit) ?? "hour",
      cost_rate: parseNumber(row.cost_rate),
      charge_rate: parseNumber(row.charge_rate),
      notes: trimOptional(row.notes),
      is_active: true,
      sort_order: sortOrder,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await updateRateRow(supabase, RATE_TABLES.labour, existingId, organisationId, {
        name: payload.name,
        role: payload.role,
        unit: payload.unit,
        cost_rate: payload.cost_rate,
        charge_rate: payload.charge_rate,
        notes: payload.notes,
        is_active: true,
      });
      if (error) {
        failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    if (existingId && duplicateStrategy === "create_new") {
      payload.name = `${name} (import)`;
    }

    const { error } = await insertRateRow(supabase, RATE_TABLES.labour, payload);
    if (error) {
      failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByName.set(payload.name.toLowerCase(), "new");
    sortOrder += 1;
    imported += 1;
  }

  return { imported, failures };
}

async function executeMaterialImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from(RATE_TABLES.material)
    .select("id, name")
    .eq("organisation_id", organisationId);

  const existingByName = new Map(
    (existingRows ?? []).map((row) => [
      String(row.name).trim().toLowerCase(),
      String(row.id),
    ])
  );

  let sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.material,
    organisationId
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const name = row.name?.trim();

    if (!name) {
      failures.push({
        rowNumber,
        reason: "Name is required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const key = name.toLowerCase();
    const existingId = existingByName.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const payload = {
      organisation_id: organisationId,
      name,
      supplier: trimOptional(row.supplier),
      category: trimOptional(row.category),
      unit: trimOptional(row.unit) ?? "each",
      cost_rate: parseNumber(row.cost_rate),
      waste_percent: parseNumber(row.waste_percent),
      notes: trimOptional(row.notes),
      is_active: true,
      sort_order: sortOrder,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await updateRateRow(supabase, RATE_TABLES.material, existingId, organisationId, {
        name: payload.name,
        supplier: payload.supplier,
        category: payload.category,
        unit: payload.unit,
        cost_rate: payload.cost_rate,
        waste_percent: payload.waste_percent,
        notes: payload.notes,
        is_active: true,
      });
      if (error) {
        failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    if (existingId && duplicateStrategy === "create_new") {
      payload.name = `${name} (import)`;
    }

    const { error } = await insertRateRow(supabase, RATE_TABLES.material, payload);
    if (error) {
      failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByName.set(payload.name.toLowerCase(), "new");
    sortOrder += 1;
    imported += 1;
  }

  return { imported, failures };
}

async function executeSupplierImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from(RATE_TABLES.supplier)
    .select("id, supplier, item")
    .eq("organisation_id", organisationId);

  const existingByKey = new Map(
    (existingRows ?? []).map((row) => [
      `${String(row.supplier).trim().toLowerCase()}|${String(row.item).trim().toLowerCase()}`,
      String(row.id),
    ])
  );

  let sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.supplier,
    organisationId
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const supplier = row.supplier?.trim();
    const item = row.item?.trim();

    if (!supplier || !item) {
      failures.push({
        rowNumber,
        reason: "Supplier and item are required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const key = `${supplier.toLowerCase()}|${item.toLowerCase()}`;
    const existingId = existingByKey.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const payload = {
      organisation_id: organisationId,
      supplier,
      item,
      unit: trimOptional(row.unit) ?? "each",
      rate: parseNumber(row.rate),
      category: trimOptional(row.category),
      notes: trimOptional(row.notes),
      is_active: true,
      sort_order: sortOrder,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await updateRateRow(supabase, RATE_TABLES.supplier, existingId, organisationId, {
        supplier: payload.supplier,
        item: payload.item,
        unit: payload.unit,
        rate: payload.rate,
        category: payload.category,
        notes: payload.notes,
        is_active: true,
      });
      if (error) {
        failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    if (existingId && duplicateStrategy === "create_new") {
      payload.item = `${item} (import)`;
    }

    const { error } = await insertRateRow(supabase, RATE_TABLES.supplier, payload);
    if (error) {
      failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByKey.set(
      `${payload.supplier.toLowerCase()}|${payload.item.toLowerCase()}`,
      "new"
    );
    sortOrder += 1;
    imported += 1;
  }

  return { imported, failures };
}

async function executeSubcontractorImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from(RATE_TABLES.subcontractor)
    .select("id, trade, supplier")
    .eq("organisation_id", organisationId);

  const existingByKey = new Map(
    (existingRows ?? []).map((row) => [
      `${String(row.trade).trim().toLowerCase()}|${String(row.supplier ?? "").trim().toLowerCase()}`,
      String(row.id),
    ])
  );

  let sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.subcontractor,
    organisationId
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const trade = row.trade?.trim();

    if (!trade) {
      failures.push({
        rowNumber,
        reason: "Trade is required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const supplier = trimOptional(row.supplier) ?? "";
    const key = `${trade.toLowerCase()}|${supplier.toLowerCase()}`;
    const existingId = existingByKey.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const payload = {
      organisation_id: organisationId,
      trade,
      supplier: supplier || null,
      rate_basis: trimOptional(row.rate_basis) ?? "item",
      rate: parseNumber(row.rate),
      notes: trimOptional(row.notes),
      is_active: true,
      sort_order: sortOrder,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await updateRateRow(supabase, RATE_TABLES.subcontractor, existingId, organisationId, {
        trade: payload.trade,
        supplier: payload.supplier,
        rate_basis: payload.rate_basis,
        rate: payload.rate,
        notes: payload.notes,
        is_active: true,
      });
      if (error) {
        failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    const { error } = await insertRateRow(
      supabase,
      RATE_TABLES.subcontractor,
      payload
    );
    if (error) {
      failures.push({ rowNumber, reason: error, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByKey.set(key, "new");
    sortOrder += 1;
    imported += 1;
  }

  return { imported, failures };
}

async function executePackagesImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from("assembly_packages")
    .select("id, name")
    .eq("organisation_id", organisationId);

  const existingByName = new Map(
    (existingRows ?? []).map((row) => [
      String(row.name).trim().toLowerCase(),
      String(row.id),
    ])
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const name = row.name?.trim();

    if (!name) {
      failures.push({
        rowNumber,
        reason: "Package name is required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const key = name.toLowerCase();
    const existingId = existingByName.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const payload = {
      organisation_id: organisationId,
      name,
      trade: trimOptional(row.trade),
      unit: trimOptional(row.unit) ?? "each",
      default_markup_percentage: row.markup?.trim()
        ? parseNumber(row.markup)
        : null,
      default_margin_percentage: row.margin?.trim()
        ? parseNumber(row.margin)
        : null,
      standard_reference: trimOptional(row.standard_reference),
      notes: trimOptional(row.notes),
      is_active: true,
      default_cost_rate: 0,
      default_sell_rate: 0,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await supabase
        .from("assembly_packages")
        .update({
          trade: payload.trade,
          unit: payload.unit,
          default_markup_percentage: payload.default_markup_percentage,
          default_margin_percentage: payload.default_margin_percentage,
          standard_reference: payload.standard_reference,
          notes: payload.notes,
        })
        .eq("id", existingId)
        .eq("organisation_id", organisationId);

      if (error) {
        failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    if (existingId && duplicateStrategy === "create_new") {
      payload.name = `${name} (import)`;
    }

    const { error } = await supabase.from("assembly_packages").insert(payload);
    if (error) {
      failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByName.set(payload.name.toLowerCase(), "new");
    imported += 1;
  }

  return { imported, failures };
}

async function executePackageComponentsImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: packages } = await supabase
    .from("assembly_packages")
    .select("id, name")
    .eq("organisation_id", organisationId);

  const packageByName = new Map(
    (packages ?? []).map((pkg) => [
      String(pkg.name).trim().toLowerCase(),
      String(pkg.id),
    ])
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const packageName = row.package?.trim();
    const itemName = row.item_name?.trim();
    const componentType = row.component_type?.trim().toLowerCase();

    if (!packageName || !itemName || !componentType) {
      failures.push({
        rowNumber,
        reason: "Package, item name, and component type are required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const packageId = packageByName.get(packageName.toLowerCase());
    if (!packageId) {
      failures.push({
        rowNumber,
        reason: `Package "${packageName}" not found. Import packages first.`,
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const validTypes = ["material", "labour", "plant", "subcontractor", "allowance"];
    if (!validTypes.includes(componentType)) {
      failures.push({
        rowNumber,
        reason: "Invalid component type.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const { data: existing } = await supabase
      .from("assembly_package_items")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("assembly_package_id", packageId)
      .eq("item_name", itemName)
      .maybeSingle();

    if (existing && duplicateStrategy === "skip") {
      continue;
    }

    const qty = parseNumber(row.quantity_per_unit, 1);
    const costRate = parseNumber(row.cost_rate);
    const wastage = parseNumber(row.wastage);

    const payload = {
      organisation_id: organisationId,
      assembly_package_id: packageId,
      item_type: componentType,
      item_name: itemName,
      quantity_per_unit: qty,
      unit: trimOptional(row.unit) ?? "each",
      wastage_percentage: wastage,
      cost_rate: costRate,
      total_cost_per_unit: qty * costRate,
      sell_rate: null,
    };

    if (existing && duplicateStrategy === "overwrite") {
      const { error } = await supabase
        .from("assembly_package_items")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    const { error } = await supabase.from("assembly_package_items").insert(payload);
    if (error) {
      failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
      continue;
    }

    imported += 1;
  }

  return { imported, failures };
}

async function executeStandardsImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from("standards")
    .select("id, reference_code")
    .eq("organisation_id", organisationId);

  const existingByCode = new Map(
    (existingRows ?? []).map((row) => [
      String(row.reference_code).trim().toLowerCase(),
      String(row.id),
    ])
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const referenceCode = row.reference_code?.trim();
    const name = row.reference_name?.trim();

    if (!referenceCode || !name) {
      failures.push({
        rowNumber,
        reason: "Reference code and name are required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const key = referenceCode.toLowerCase();
    const existingId = existingByCode.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const payload = {
      organisation_id: organisationId,
      reference_code: referenceCode,
      name,
      trade: trimOptional(row.trade),
      description: trimOptional(row.description),
      standard_type: "custom" as const,
      is_active: true,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await supabase
        .from("standards")
        .update({
          name: payload.name,
          trade: payload.trade,
          description: payload.description,
        })
        .eq("id", existingId)
        .eq("organisation_id", organisationId);

      if (error) {
        failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    if (existingId && duplicateStrategy === "create_new") {
      payload.reference_code = `${referenceCode}-import`;
    }

    const { error } = await supabase.from("standards").insert(payload);
    if (error) {
      failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByCode.set(payload.reference_code.toLowerCase(), "new");
    imported += 1;
  }

  return { imported, failures };
}

async function executeClarificationTemplatesImport(
  organisationId: string,
  rows: Record<string, string>[],
  duplicateStrategy: DuplicateStrategy
): Promise<{ imported: number; failures: ImportRowFailure[] }> {
  const supabase = await createClient();
  const failures: ImportRowFailure[] = [];
  let imported = 0;

  const { data: existingRows } = await supabase
    .from("clarification_templates")
    .select("id, type, title")
    .eq("organisation_id", organisationId);

  const existingByKey = new Map(
    (existingRows ?? []).map((row) => [
      `${String(row.type).trim().toLowerCase()}|${String(row.title).trim().toLowerCase()}`,
      String(row.id),
    ])
  );

  const { count } = await supabase
    .from("clarification_templates")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  let sortOrder = count ?? 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const type = row.type?.trim().toLowerCase();
    const title = row.title?.trim();

    if (!type || !title) {
      failures.push({
        rowNumber,
        reason: "Type and title are required.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    if (type !== "exclusion" && type !== "assumption") {
      failures.push({
        rowNumber,
        reason: "Template type must be exclusion or assumption.",
        originalValue: rowSnapshot(row),
      });
      continue;
    }

    const key = `${type}|${title.toLowerCase()}`;
    const existingId = existingByKey.get(key);

    if (existingId && duplicateStrategy === "skip") {
      continue;
    }

    const descriptionParts = [row.description?.trim(), row.priority?.trim()]
      .filter(Boolean)
      .join(" · Priority: ");

    const payload = {
      organisation_id: organisationId,
      type,
      title,
      description: descriptionParts || null,
      category: trimOptional(row.category),
      sort_order: sortOrder,
      is_active: true,
    };

    if (existingId && duplicateStrategy === "overwrite") {
      const { error } = await supabase
        .from("clarification_templates")
        .update({
          description: payload.description,
          category: payload.category,
        })
        .eq("id", existingId);

      if (error) {
        failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
        continue;
      }
      imported += 1;
      continue;
    }

    if (existingId && duplicateStrategy === "create_new") {
      payload.title = `${title} (import)`;
    }

    const { error } = await supabase.from("clarification_templates").insert(payload);
    if (error) {
      failures.push({ rowNumber, reason: error.message, originalValue: rowSnapshot(row) });
      continue;
    }

    existingByKey.set(`${type}|${payload.title.toLowerCase()}`, "new");
    sortOrder += 1;
    imported += 1;
  }

  return { imported, failures };
}

function revalidateImportPaths(importType: ImportType) {
  revalidatePath("/imports");
  revalidatePath("/dashboard");
  revalidatePath("/rates");
  revalidatePath("/templates");
  revalidatePath("/standards");
  revalidatePath("/settings");

  if (
    importType === "labour_rates" ||
    importType === "material_rates" ||
    importType === "supplier_rates" ||
    importType === "subcontractor_rates"
  ) {
    revalidatePath("/rates");
  }
}

export async function executeBulkImportAction(
  input: ExecuteImportInput
): Promise<ImportExecutionResult & { error?: string }> {
  const { profile, user } = await requireOrganisationProfile();
  const organisationId = profile.organisation_id;

  if (!input.rows.length) {
    return { error: "No rows to import.", imported: 0, failed: 0, failures: [], batchId: null };
  }

  let result: { imported: number; failures: ImportRowFailure[] };

  switch (input.importType) {
    case "labour_rates":
      result = await executeLabourImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "material_rates":
      result = await executeMaterialImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "supplier_rates":
      result = await executeSupplierImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "subcontractor_rates":
      result = await executeSubcontractorImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "packages":
      result = await executePackagesImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "package_components":
      result = await executePackageComponentsImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "standards":
      result = await executeStandardsImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    case "clarification_templates":
      result = await executeClarificationTemplatesImport(
        organisationId,
        input.rows,
        input.duplicateStrategy
      );
      break;
    default:
      return {
        error: "Unsupported import type.",
        imported: 0,
        failed: input.rows.length,
        failures: [],
        batchId: null,
      };
  }

  const supabase = await createClient();
  const batchId = await recordImportBatch(
    supabase,
    organisationId,
    user.id,
    input.importType,
    input.duplicateStrategy,
    result.imported,
    result.failures.length
  );

  revalidateImportPaths(input.importType);

  return {
    imported: result.imported,
    failed: result.failures.length,
    failures: result.failures,
    batchId,
  };
}
