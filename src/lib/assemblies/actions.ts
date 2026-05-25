"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  calculateComponentTotalCostPerUnit,
  calculatePackageSellRate,
  sumComponentCostsPerUnit,
} from "@/src/lib/assemblies/calculations";
import { isAssemblyItemType } from "@/src/lib/assemblies/constants";
import {
  ASSEMBLY_ITEM_TABLE,
  ASSEMBLY_PACKAGE_TABLE,
  deleteAssemblyRow,
  insertAssemblyRow,
  resolveAssemblyOrganisationContext,
  updateAssemblyRow,
} from "@/src/lib/assemblies/assembly-schema";
import { getAssemblyPackageItems } from "@/src/lib/assemblies/queries";
import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasMarginValue, hasMarkupValue } from "@/src/lib/pricing/calculations";
import { createClient } from "@/src/lib/supabase/server";
import type {
  AssemblyPackageInput,
  AssemblyPackageItemInput,
  AssemblyPackageItemUpdate,
  AssemblyPackageUpdate,
} from "@/src/types/database";

export type AssemblyActionResult = {
  error?: string;
  id?: string;
};

function revalidateAssemblies(packageId?: string) {
  revalidatePath("/templates");
  revalidatePath("/dashboard");
  if (packageId) {
    revalidatePath(`/templates/${packageId}`);
  }
}

function trimOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
}

async function requireAssemblySession(): Promise<
  | { error: string }
  | { organisationId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to manage assemblies." };
  }

  const profile = await getProfileForUser(user.id);
  if (!profile) {
    return {
      error:
        "Your profile is missing. Complete onboarding before managing assemblies.",
    };
  }

  const context = resolveAssemblyOrganisationContext(profile);
  if ("error" in context) {
    return { error: context.error };
  }

  return { organisationId: context.organisationId };
}

function validateMarkupMargin(
  markup: number | null | undefined,
  margin: number | null | undefined
): { error?: string } {
  if (hasMarginValue(margin) && hasMarkupValue(markup)) {
    return {
      error:
        "Use either margin % or markup %, not both. Margin takes priority when both are set.",
    };
  }

  if (hasMarginValue(margin) && margin! >= 100) {
    return { error: "Margin % must be less than 100." };
  }

  if (hasMarkupValue(markup) && markup! < 0) {
    return { error: "Markup % must be zero or greater." };
  }

  return {};
}

/** Roll up component costs and apply margin/markup to package sell rate. */
export async function recalculateAssemblyPackageTotals(
  packageId: string,
  organisationId: string,
  pricingOverrides?: {
    default_markup_percentage?: number | null;
    default_margin_percentage?: number | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: pkg, error: pkgError } = await supabase
    .from(ASSEMBLY_PACKAGE_TABLE)
    .select(
      "default_markup_percentage, default_margin_percentage"
    )
    .eq("id", packageId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (pkgError || !pkg) {
    return { error: pkgError?.message ?? "Assembly not found." };
  }

  const items = await getAssemblyPackageItems(packageId, organisationId);
  const default_cost_rate = sumComponentCostsPerUnit(items);

  const markup =
    pricingOverrides?.default_markup_percentage !== undefined
      ? pricingOverrides.default_markup_percentage
      : pkg.default_markup_percentage;
  const margin =
    pricingOverrides?.default_margin_percentage !== undefined
      ? pricingOverrides.default_margin_percentage
      : pkg.default_margin_percentage;

  const pricing = calculatePackageSellRate({
    default_cost_rate,
    default_markup_percentage: markup,
    default_margin_percentage: margin,
  });

  const { error } = await updateAssemblyRow(
    supabase,
    ASSEMBLY_PACKAGE_TABLE,
    packageId,
    organisationId,
    {
      default_cost_rate,
      default_sell_rate: pricing.default_sell_rate,
      default_markup_percentage: pricing.default_markup_percentage,
      default_margin_percentage: pricing.default_margin_percentage,
    }
  );

  return error ? { error } : {};
}

// — Packages —

export async function createAssemblyPackageAction(
  input: AssemblyPackageInput
): Promise<AssemblyActionResult> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const marginCheck = validateMarkupMargin(
    input.default_markup_percentage,
    input.default_margin_percentage
  );
  if (marginCheck.error) {
    return { error: marginCheck.error };
  }

  const session = await requireAssemblySession();
  if ("error" in session) {
    return { error: session.error };
  }

  const pricing = calculatePackageSellRate({
    default_cost_rate: 0,
    default_markup_percentage: input.default_markup_percentage,
    default_margin_percentage: input.default_margin_percentage,
  });

  const supabase = await createClient();
  const { id, error } = await insertAssemblyRow(
    supabase,
    ASSEMBLY_PACKAGE_TABLE,
    {
      organisation_id: session.organisationId,
      name,
      description: trimOptional(input.description ?? null),
      trade: trimOptional(input.trade ?? null),
      unit: (input.unit ?? "m2").trim() || "m2",
      default_cost_rate: 0,
      default_sell_rate: pricing.default_sell_rate,
      default_markup_percentage: pricing.default_markup_percentage,
      default_margin_percentage: pricing.default_margin_percentage,
      standard_reference: trimOptional(input.standard_reference ?? null),
      specification_reference: trimOptional(
        input.specification_reference ?? null
      ),
      notes: trimOptional(input.notes ?? null),
      is_active: input.is_active ?? true,
    }
  );

  if (error) {
    return { error };
  }

  revalidateAssemblies(id ?? undefined);
  return { id: id ?? undefined };
}

export async function createAssemblyPackageAndRedirectAction(
  input: AssemblyPackageInput
): Promise<AssemblyActionResult> {
  const result = await createAssemblyPackageAction(input);

  if (result.error || !result.id) {
    return result;
  }

  redirect(`/templates/${result.id}`);
}

export async function updateAssemblyPackageAction(
  packageId: string,
  input: AssemblyPackageUpdate
): Promise<AssemblyActionResult> {
  if (input.name !== undefined && !input.name.trim()) {
    return { error: "Name is required." };
  }

  const marginCheck = validateMarkupMargin(
    input.default_markup_percentage,
    input.default_margin_percentage
  );
  if (marginCheck.error) {
    return { error: marginCheck.error };
  }

  const session = await requireAssemblySession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) {
    payload.description = trimOptional(input.description);
  }
  if (input.trade !== undefined) payload.trade = trimOptional(input.trade);
  if (input.unit !== undefined) payload.unit = input.unit.trim() || "m2";
  if (input.standard_reference !== undefined) {
    payload.standard_reference = trimOptional(input.standard_reference);
  }
  if (input.specification_reference !== undefined) {
    payload.specification_reference = trimOptional(
      input.specification_reference
    );
  }
  if (input.notes !== undefined) payload.notes = trimOptional(input.notes);
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  if (Object.keys(payload).length > 0) {
    const { error } = await updateAssemblyRow(
      supabase,
      ASSEMBLY_PACKAGE_TABLE,
      packageId,
      session.organisationId,
      payload
    );
    if (error) {
      return { error };
    }
  }

  if (
    input.default_markup_percentage !== undefined ||
    input.default_margin_percentage !== undefined
  ) {
    const recalc = await recalculateAssemblyPackageTotals(
      packageId,
      session.organisationId,
      {
        default_markup_percentage: input.default_markup_percentage,
        default_margin_percentage: input.default_margin_percentage,
      }
    );
    if (recalc.error) {
      return { error: recalc.error };
    }
  }

  revalidateAssemblies(packageId);
  return {};
}

export async function deactivateAssemblyPackageAction(
  packageId: string
): Promise<AssemblyActionResult> {
  return updateAssemblyPackageAction(packageId, { is_active: false });
}

export async function deleteAssemblyPackageAction(
  packageId: string
): Promise<AssemblyActionResult> {
  const session = await requireAssemblySession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await deleteAssemblyRow(
    supabase,
    ASSEMBLY_PACKAGE_TABLE,
    packageId,
    session.organisationId
  );

  if (error) {
    return { error };
  }

  revalidateAssemblies();
  return {};
}

// — Components —

function buildComponentPayload(
  input: AssemblyPackageItemInput | AssemblyPackageItemUpdate,
  organisationId: string,
  packageId: string
): { payload: Record<string, unknown>; error?: string } {
  if (input.item_type !== undefined && !isAssemblyItemType(input.item_type)) {
    return { payload: {}, error: "Select a valid component type." };
  }

  const quantity = input.quantity_per_unit ?? 0;
  const wastage = input.wastage_percentage ?? 0;
  const costRate = input.cost_rate ?? 0;

  if (quantity < 0 || costRate < 0) {
    return { payload: {}, error: "Quantity and cost rate must be zero or greater." };
  }

  if (wastage < 0 || wastage > 100) {
    return { payload: {}, error: "Wastage % must be between 0 and 100." };
  }

  const total_cost_per_unit = calculateComponentTotalCostPerUnit({
    quantity_per_unit: quantity,
    wastage_percentage: wastage,
    cost_rate: costRate,
  });

  const payload: Record<string, unknown> = {
    organisation_id: organisationId,
    assembly_package_id: packageId,
    total_cost_per_unit,
  };

  if (input.item_type !== undefined) payload.item_type = input.item_type;
  if (input.item_name !== undefined) payload.item_name = input.item_name.trim();
  if (input.quantity_per_unit !== undefined) {
    payload.quantity_per_unit = quantity;
  }
  if (input.unit !== undefined) payload.unit = input.unit.trim() || "each";
  if (input.wastage_percentage !== undefined) {
    payload.wastage_percentage = wastage;
  }
  if (input.cost_rate !== undefined) payload.cost_rate = costRate;
  if (input.sell_rate !== undefined) {
    payload.sell_rate =
      input.sell_rate === null ? null : Math.max(0, input.sell_rate);
  }
  if (input.notes !== undefined) payload.notes = trimOptional(input.notes);

  return { payload };
}

export async function createAssemblyPackageItemAction(
  packageId: string,
  input: AssemblyPackageItemInput
): Promise<AssemblyActionResult> {
  const itemName = input.item_name.trim();
  if (!itemName) {
    return { error: "Item name is required." };
  }

  if (!isAssemblyItemType(input.item_type)) {
    return { error: "Select a valid component type." };
  }

  const session = await requireAssemblySession();
  if ("error" in session) {
    return { error: session.error };
  }

  const built = buildComponentPayload(
    { ...input, item_name: itemName },
    session.organisationId,
    packageId
  );
  if (built.error) {
    return { error: built.error };
  }

  const supabase = await createClient();
  const { id, error } = await insertAssemblyRow(
    supabase,
    ASSEMBLY_ITEM_TABLE,
    built.payload
  );

  if (error) {
    return { error };
  }

  const recalc = await recalculateAssemblyPackageTotals(
    packageId,
    session.organisationId
  );
  if (recalc.error) {
    return { error: recalc.error };
  }

  revalidateAssemblies(packageId);
  return { id: id ?? undefined };
}

export async function updateAssemblyPackageItemAction(
  itemId: string,
  packageId: string,
  input: AssemblyPackageItemUpdate
): Promise<AssemblyActionResult> {
  if (input.item_name !== undefined && !input.item_name.trim()) {
    return { error: "Item name is required." };
  }

  const session = await requireAssemblySession();
  if ("error" in session) {
    return { error: session.error };
  }

  const existingItems = await getAssemblyPackageItems(
    packageId,
    session.organisationId
  );
  const existing = existingItems.find((i) => i.id === itemId);
  if (!existing) {
    return { error: "Component not found." };
  }

  const merged: AssemblyPackageItemInput = {
    item_type: input.item_type ?? existing.item_type,
    item_name: input.item_name ?? existing.item_name,
    quantity_per_unit: input.quantity_per_unit ?? existing.quantity_per_unit,
    unit: input.unit ?? existing.unit,
    wastage_percentage:
      input.wastage_percentage ?? existing.wastage_percentage,
    cost_rate: input.cost_rate ?? existing.cost_rate,
    sell_rate: input.sell_rate !== undefined ? input.sell_rate : existing.sell_rate,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  };

  const built = buildComponentPayload(
    merged,
    session.organisationId,
    packageId
  );
  if (built.error) {
    return { error: built.error };
  }

  const { organisation_id: _org, assembly_package_id: _pkg, ...updatePayload } =
    built.payload;

  const supabase = await createClient();
  const { error } = await updateAssemblyRow(
    supabase,
    ASSEMBLY_ITEM_TABLE,
    itemId,
    session.organisationId,
    updatePayload
  );

  if (error) {
    return { error };
  }

  const recalc = await recalculateAssemblyPackageTotals(
    packageId,
    session.organisationId
  );
  if (recalc.error) {
    return { error: recalc.error };
  }

  revalidateAssemblies(packageId);
  return {};
}

export async function deleteAssemblyPackageItemAction(
  itemId: string,
  packageId: string
): Promise<AssemblyActionResult> {
  const session = await requireAssemblySession();
  if ("error" in session) {
    return { error: session.error };
  }

  const supabase = await createClient();
  const { error } = await deleteAssemblyRow(
    supabase,
    ASSEMBLY_ITEM_TABLE,
    itemId,
    session.organisationId
  );

  if (error) {
    return { error };
  }

  const recalc = await recalculateAssemblyPackageTotals(
    packageId,
    session.organisationId
  );
  if (recalc.error) {
    return { error: recalc.error };
  }

  revalidateAssemblies(packageId);
  return {};
}
