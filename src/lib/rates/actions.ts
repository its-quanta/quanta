"use server";

import { revalidatePath } from "next/cache";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import {
  buildSupplierDatePayload,
  buildSupplierItemPayload,
} from "@/src/lib/rates/rates-query-schema";
import {
  deleteRateRow,
  getNextRateSortOrder,
  insertRateRow,
  RATE_TABLES,
  resolveRateOrganisationContext,
  updateRateRow,
} from "@/src/lib/rates/rates-schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  LabourRateInput,
  LabourRateUpdate,
  MaterialRateInput,
  MaterialRateUpdate,
  SubcontractorRateInput,
  SubcontractorRateUpdate,
  SupplierRateInput,
  SupplierRateUpdate,
} from "@/src/types/database";

export type RateActionResult = {
  error?: string;
  id?: string;
};

function revalidateRates() {
  revalidatePath("/rates");
  revalidatePath("/dashboard");
}

function trimOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function parseNonNegativeNumber(
  value: number | undefined,
  fieldLabel: string
): { value?: number; error?: string } {
  if (value === undefined) {
    return {};
  }
  if (Number.isNaN(value) || value < 0) {
    return { error: `${fieldLabel} must be zero or greater.` };
  }
  return { value };
}

function parseWastePercent(value: number | undefined): {
  value?: number;
  error?: string;
} {
  if (value === undefined) {
    return {};
  }
  if (Number.isNaN(value) || value < 0 || value > 100) {
    return { error: "Waste % must be between 0 and 100." };
  }
  return { value };
}

function parseDateField(value: string | null | undefined): string | null {
  const text = trimOptional(value ?? null);
  if (!text) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  return text;
}

async function requireRatesSession(): Promise<
  | { error: string }
  | { organisationId: string }
> {
  const { profile } = await requireOrganisationProfile();
  const context = resolveRateOrganisationContext(profile);

  if ("error" in context) {
    return { error: context.error };
  }

  return { organisationId: context.organisationId };
}

// — Labour (public.labour_rates) —

export async function createLabourRateAction(
  input: LabourRateInput
): Promise<RateActionResult> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const costParsed = parseNonNegativeNumber(input.cost_rate, "Cost rate");
  if (costParsed.error) {
    return { error: costParsed.error };
  }

  const chargeParsed = parseNonNegativeNumber(input.charge_rate, "Charge rate");
  if (chargeParsed.error) {
    return { error: chargeParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.labour,
    session.organisationId
  );

  const { id, error } = await insertRateRow(supabase, RATE_TABLES.labour, {
    organisation_id: session.organisationId,
    name,
    role: trimOptional(input.role ?? null),
    unit: (input.unit ?? "hour").trim() || "hour",
    cost_rate: costParsed.value ?? 0,
    charge_rate: chargeParsed.value ?? 0,
    notes: trimOptional(input.notes ?? null),
    is_active: input.is_active ?? true,
    sort_order: sortOrder,
  });

  if (error) {
    return { error };
  }

  revalidateRates();
  return { id: id ?? undefined };
}

export async function updateLabourRateAction(
  id: string,
  input: LabourRateUpdate
): Promise<RateActionResult> {
  if (input.name !== undefined && !input.name.trim()) {
    return { error: "Name is required." };
  }

  const costParsed = parseNonNegativeNumber(input.cost_rate, "Cost rate");
  if (costParsed.error) {
    return { error: costParsed.error };
  }

  const chargeParsed = parseNonNegativeNumber(input.charge_rate, "Charge rate");
  if (chargeParsed.error) {
    return { error: chargeParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.role !== undefined) payload.role = trimOptional(input.role);
  if (input.unit !== undefined) payload.unit = input.unit.trim() || "hour";
  if (costParsed.value !== undefined) payload.cost_rate = costParsed.value;
  if (chargeParsed.value !== undefined) payload.charge_rate = chargeParsed.value;
  if (input.notes !== undefined) payload.notes = trimOptional(input.notes);
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  const { error } = await updateRateRow(
    supabase,
    RATE_TABLES.labour,
    id,
    session.organisationId,
    payload
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

export async function deleteLabourRateAction(id: string): Promise<RateActionResult> {
  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await deleteRateRow(
    supabase,
    RATE_TABLES.labour,
    id,
    session.organisationId
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

// — Material (public.material_rates) —

export async function createMaterialRateAction(
  input: MaterialRateInput
): Promise<RateActionResult> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const costParsed = parseNonNegativeNumber(input.cost_rate, "Cost rate");
  if (costParsed.error) {
    return { error: costParsed.error };
  }

  const wasteParsed = parseWastePercent(input.waste_percent);
  if (wasteParsed.error) {
    return { error: wasteParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.material,
    session.organisationId
  );

  const { id, error } = await insertRateRow(supabase, RATE_TABLES.material, {
    organisation_id: session.organisationId,
    name,
    supplier: trimOptional(input.supplier ?? null),
    unit: (input.unit ?? "each").trim() || "each",
    cost_rate: costParsed.value ?? 0,
    waste_percent: wasteParsed.value ?? 0,
    category: trimOptional(input.category ?? null),
    notes: trimOptional(input.notes ?? null),
    is_active: input.is_active ?? true,
    sort_order: sortOrder,
  });

  if (error) {
    return { error };
  }

  revalidateRates();
  return { id: id ?? undefined };
}

export async function updateMaterialRateAction(
  id: string,
  input: MaterialRateUpdate
): Promise<RateActionResult> {
  if (input.name !== undefined && !input.name.trim()) {
    return { error: "Name is required." };
  }

  const costParsed = parseNonNegativeNumber(input.cost_rate, "Cost rate");
  if (costParsed.error) {
    return { error: costParsed.error };
  }

  const wasteParsed = parseWastePercent(input.waste_percent);
  if (wasteParsed.error) {
    return { error: wasteParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.supplier !== undefined) payload.supplier = trimOptional(input.supplier);
  if (input.unit !== undefined) payload.unit = input.unit.trim() || "each";
  if (costParsed.value !== undefined) payload.cost_rate = costParsed.value;
  if (wasteParsed.value !== undefined) payload.waste_percent = wasteParsed.value;
  if (input.category !== undefined) payload.category = trimOptional(input.category);
  if (input.notes !== undefined) payload.notes = trimOptional(input.notes);
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  const { error } = await updateRateRow(
    supabase,
    RATE_TABLES.material,
    id,
    session.organisationId,
    payload
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

export async function deleteMaterialRateAction(
  id: string
): Promise<RateActionResult> {
  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await deleteRateRow(
    supabase,
    RATE_TABLES.material,
    id,
    session.organisationId
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

// — Supplier (public.supplier_rates) —

export async function createSupplierRateAction(
  input: SupplierRateInput
): Promise<RateActionResult> {
  const supplier = input.supplier.trim();
  const item = input.item.trim();
  if (!supplier) {
    return { error: "Supplier is required." };
  }
  if (!item) {
    return { error: "Item is required." };
  }

  const rateParsed = parseNonNegativeNumber(input.rate, "Rate");
  if (rateParsed.error) {
    return { error: rateParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.supplier,
    session.organisationId
  );

  const parsedDate = parseDateField(input.rate_updated_date);

  const { id, error } = await insertRateRow(supabase, RATE_TABLES.supplier, {
    organisation_id: session.organisationId,
    supplier,
    ...buildSupplierItemPayload(item),
    unit: (input.unit ?? "each").trim() || "each",
    rate: rateParsed.value ?? 0,
    category: trimOptional(input.category ?? null),
    notes: trimOptional(input.notes ?? null),
    is_active: input.is_active ?? true,
    ...buildSupplierDatePayload(parsedDate),
    sort_order: sortOrder,
  });

  if (error) {
    return { error };
  }

  revalidateRates();
  return { id: id ?? undefined };
}

export async function updateSupplierRateAction(
  id: string,
  input: SupplierRateUpdate
): Promise<RateActionResult> {
  if (input.supplier !== undefined && !input.supplier.trim()) {
    return { error: "Supplier is required." };
  }
  if (input.item !== undefined && !input.item.trim()) {
    return { error: "Item is required." };
  }

  const rateParsed = parseNonNegativeNumber(input.rate, "Rate");
  if (rateParsed.error) {
    return { error: rateParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (input.supplier !== undefined) payload.supplier = input.supplier.trim();
  if (input.item !== undefined) payload.item = input.item.trim();
  if (input.unit !== undefined) payload.unit = input.unit.trim() || "each";
  if (rateParsed.value !== undefined) payload.rate = rateParsed.value;
  if (input.category !== undefined) payload.category = trimOptional(input.category);
  if (input.notes !== undefined) payload.notes = trimOptional(input.notes);
  if (input.is_active !== undefined) payload.is_active = input.is_active;
  if (input.rate_updated_date !== undefined) {
    Object.assign(
      payload,
      buildSupplierDatePayload(parseDateField(input.rate_updated_date))
    );
  }

  const { error } = await updateRateRow(
    supabase,
    RATE_TABLES.supplier,
    id,
    session.organisationId,
    payload
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

export async function deleteSupplierRateAction(
  id: string
): Promise<RateActionResult> {
  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await deleteRateRow(
    supabase,
    RATE_TABLES.supplier,
    id,
    session.organisationId
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

// — Subcontractor (public.subcontractor_rates) —

export async function createSubcontractorRateAction(
  input: SubcontractorRateInput
): Promise<RateActionResult> {
  const trade = input.trade.trim();
  if (!trade) {
    return { error: "Trade is required." };
  }

  const rateParsed = parseNonNegativeNumber(input.rate, "Rate");
  if (rateParsed.error) {
    return { error: rateParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const sortOrder = await getNextRateSortOrder(
    supabase,
    RATE_TABLES.subcontractor,
    session.organisationId
  );

  const { id, error } = await insertRateRow(
    supabase,
    RATE_TABLES.subcontractor,
    {
      organisation_id: session.organisationId,
      trade,
      supplier: trimOptional(input.supplier ?? null),
      rate_basis: (input.rate_basis ?? "item").trim() || "item",
      rate: rateParsed.value ?? 0,
      notes: trimOptional(input.notes ?? null),
      is_active: input.is_active ?? true,
      sort_order: sortOrder,
    }
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return { id: id ?? undefined };
}

export async function updateSubcontractorRateAction(
  id: string,
  input: SubcontractorRateUpdate
): Promise<RateActionResult> {
  if (input.trade !== undefined && !input.trade.trim()) {
    return { error: "Trade is required." };
  }

  const rateParsed = parseNonNegativeNumber(input.rate, "Rate");
  if (rateParsed.error) {
    return { error: rateParsed.error };
  }

  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (input.trade !== undefined) payload.trade = input.trade.trim();
  if (input.supplier !== undefined) payload.supplier = trimOptional(input.supplier);
  if (input.rate_basis !== undefined) {
    payload.rate_basis = input.rate_basis.trim() || "item";
  }
  if (rateParsed.value !== undefined) payload.rate = rateParsed.value;
  if (input.notes !== undefined) payload.notes = trimOptional(input.notes);
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  const { error } = await updateRateRow(
    supabase,
    RATE_TABLES.subcontractor,
    id,
    session.organisationId,
    payload
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}

export async function deleteSubcontractorRateAction(
  id: string
): Promise<RateActionResult> {
  const session = await requireRatesSession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await deleteRateRow(
    supabase,
    RATE_TABLES.subcontractor,
    id,
    session.organisationId
  );

  if (error) {
    return { error };
  }

  revalidateRates();
  return {};
}
