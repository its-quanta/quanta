"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAssemblyPackageById } from "@/src/lib/assemblies/queries";
import { getProfileForUser } from "@/src/lib/auth/get-profile";
import {
  clearGeneratedEstimateForTakeoff,
  regenerateEstimateForTakeoff,
} from "@/src/lib/estimate-generation/generate";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { computeAverageMarginPercent } from "@/src/lib/pricing/calculations";
import {
  syncProjectPricingTotals,
  syncTakeoffItemPricingStatus,
} from "@/src/lib/pricing/actions";
import {
  insertPricingItemWithFallback,
  updatePricingItemWithFallback,
} from "@/src/lib/pricing/pricing-schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  ApplyAssemblyPackageInput,
  OrganisationProfile,
  PricingMethod,
} from "@/src/types/database";
import type { User } from "@supabase/supabase-js";

export type ApplyAssemblyPackageResult = {
  error?: string;
  needsReplace?: boolean;
  existingPricingMethod?: PricingMethod;
  takeoffItemAssemblyId?: string;
  pricingItemId?: string;
  materialCount?: number;
  labourCount?: number;
};

export type RemoveAssemblyPackageResult = {
  error?: string;
};

function isMissingRpcError(message: string): boolean {
  return (
    /function .* does not exist/i.test(message) ||
    /could not find the function/i.test(message)
  );
}

async function upsertTakeoffItemAssembly(
  supabase: SupabaseClient,
  params: {
    organisationId: string;
    projectId: string;
    takeoffItemId: string;
    assemblyPackageId: string;
    quantity: number;
    unit: string;
    calculatedCost: number;
    calculatedSell: number;
    calculatedMargin: number;
  }
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("upsert_takeoff_item_assembly", {
    p_project_id: params.projectId,
    p_takeoff_item_id: params.takeoffItemId,
    p_assembly_package_id: params.assemblyPackageId,
    p_quantity: params.quantity,
    p_unit: params.unit,
    p_calculated_cost: params.calculatedCost,
    p_calculated_sell: params.calculatedSell,
    p_calculated_margin: params.calculatedMargin,
  });

  if (!error && data != null) {
    return { id: String(data), error: null };
  }

  if (error && !isMissingRpcError(error.message)) {
    return { id: null, error: formatSupabaseError(error) };
  }

  const assemblyPayload = {
    organisation_id: params.organisationId,
    project_id: params.projectId,
    takeoff_item_id: params.takeoffItemId,
    assembly_package_id: params.assemblyPackageId,
    quantity: params.quantity,
    unit: params.unit,
    calculated_cost: params.calculatedCost,
    calculated_sell: params.calculatedSell,
    calculated_margin: params.calculatedMargin,
  };

  const { data: existingAssembly, error: assemblyLookupError } = await supabase
    .from("takeoff_item_assemblies")
    .select("id")
    .eq("takeoff_item_id", params.takeoffItemId)
    .eq("organisation_id", params.organisationId)
    .maybeSingle();

  if (assemblyLookupError) {
    if (/relation .+ does not exist/i.test(assemblyLookupError.message)) {
      return {
        id: null,
        error:
          "Package applications are not available yet. Run the latest database migrations (20260525240000 and 20260525250000).",
      };
    }

    if (/row-level security/i.test(assemblyLookupError.message)) {
      return {
        id: null,
        error:
          "Could not save package application. Run migration supabase/migrations/20260525250000_takeoff_item_assemblies_rls_rpc.sql on your Supabase project.",
      };
    }

    return { id: null, error: formatSupabaseError(assemblyLookupError) };
  }

  if (existingAssembly) {
    const { data: updated, error: updateAssemblyError } = await supabase
      .from("takeoff_item_assemblies")
      .update(assemblyPayload)
      .eq("id", existingAssembly.id)
      .eq("organisation_id", params.organisationId)
      .select("id")
      .single();

    if (updateAssemblyError) {
      if (/row-level security/i.test(updateAssemblyError.message)) {
        return {
          id: null,
          error:
            "Could not save package application. Run migration supabase/migrations/20260525250000_takeoff_item_assemblies_rls_rpc.sql on your Supabase project.",
        };
      }
      return { id: null, error: formatSupabaseError(updateAssemblyError) };
    }

    return { id: updated?.id ?? null, error: null };
  }

  const { data: inserted, error: insertAssemblyError } = await supabase
    .from("takeoff_item_assemblies")
    .insert(assemblyPayload)
    .select("id")
    .single();

  if (insertAssemblyError) {
    if (/row-level security/i.test(insertAssemblyError.message)) {
      return {
        id: null,
        error:
          "Could not save package application. Run migration supabase/migrations/20260525250000_takeoff_item_assemblies_rls_rpc.sql on your Supabase project.",
      };
    }
    return { id: null, error: formatSupabaseError(insertAssemblyError) };
  }

  return { id: inserted?.id ?? null, error: null };
}

function formatSupabaseError(error: {
  message: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => Boolean(part && part.trim())
  );

  return parts.join(" — ");
}

async function assertProjectAccess(
  projectId: string,
  organisationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Project not found." };
  }

  return {};
}

async function requireApplyPackageSession(projectId: string): Promise<
  | { error: string }
  | { user: User; profile: OrganisationProfile }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to apply a package." };
  }

  const profile = await getProfileForUser(user.id);

  if (!profile) {
    return { error: "Profile not found. Sign in again." };
  }

  if (!hasOrganisation(profile)) {
    return { error: "Complete onboarding before applying packages." };
  }

  const access = await assertProjectAccess(
    projectId,
    profile.organisation_id
  );

  if (access.error) {
    return { error: access.error };
  }

  return {
    user,
    profile: profile as OrganisationProfile,
  };
}

export async function applyAssemblyPackageToTakeoffAction(
  projectId: string,
  input: ApplyAssemblyPackageInput
): Promise<ApplyAssemblyPackageResult> {
  if (!projectId) {
    return { error: "Project not found." };
  }

  if (!input.takeoff_item_id) {
    return { error: "Takeoff item is required." };
  }

  if (!input.assembly_package_id) {
    return { error: "Select an assembly package." };
  }

  if (input.quantity < 0) {
    return { error: "Quantity cannot be negative." };
  }

  const unit = input.unit?.trim() || "each";

  const session = await requireApplyPackageSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const organisationId = session.profile.organisation_id;
  const supabase = await createClient();

  const { data: takeoff, error: takeoffError } = await supabase
    .from("takeoff_items")
    .select("id, project_id, organisation_id, status, quantity, unit")
    .eq("id", input.takeoff_item_id)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (takeoffError || !takeoff) {
    return { error: "Takeoff item not found." };
  }

  if (takeoff.project_id !== projectId) {
    return { error: "Takeoff item not found." };
  }

  if (takeoff.status === "excluded") {
    return { error: "Cannot apply a package to an excluded takeoff line." };
  }

  const assemblyPackage = await getAssemblyPackageById(
    input.assembly_package_id,
    organisationId
  );

  if (!assemblyPackage) {
    return { error: "Assembly package not found." };
  }

  if (!assemblyPackage.is_active) {
    return { error: "This assembly package is inactive. Choose another package." };
  }

  const costRate = assemblyPackage.default_cost_rate;
  const sellRate = assemblyPackage.default_sell_rate;
  const formQuantity = input.quantity;
  const calculatedCost = formQuantity * costRate;
  const calculatedSell = formQuantity * sellRate;
  const calculatedGrossProfit = calculatedSell - calculatedCost;
  const calculatedMarginPercent =
    computeAverageMarginPercent(calculatedSell, calculatedGrossProfit) ?? 0;

  const pricingQuantity = Number(takeoff.quantity);
  const pricingUnit = String(takeoff.unit);
  const totalCost = pricingQuantity * costRate;
  const totalSell = pricingQuantity * sellRate;
  const grossProfit = totalSell - totalCost;
  const marginPercentage =
    computeAverageMarginPercent(totalSell, grossProfit);

  const { data: existingPricing, error: pricingLookupError } = await supabase
    .from("pricing_items")
    .select("id, pricing_method")
    .eq("takeoff_item_id", input.takeoff_item_id)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pricingLookupError) {
    return { error: formatSupabaseError(pricingLookupError) };
  }

  if (
    existingPricing &&
    existingPricing.pricing_method !== "package" &&
    !input.replace_existing_pricing
  ) {
    return {
      needsReplace: true,
      existingPricingMethod: existingPricing.pricing_method as PricingMethod,
    };
  }

  const assemblyUpsert = await upsertTakeoffItemAssembly(
    supabase,
    {
      organisationId,
      projectId,
      takeoffItemId: input.takeoff_item_id,
      assemblyPackageId: input.assembly_package_id,
      quantity: formQuantity,
      unit,
      calculatedCost,
      calculatedSell,
      calculatedMargin: calculatedMarginPercent,
    }
  );

  if (assemblyUpsert.error) {
    return { error: assemblyUpsert.error };
  }

  const takeoffItemAssemblyId = assemblyUpsert.id;
  if (!takeoffItemAssemblyId) {
    return { error: "Failed to save package application." };
  }

  const pricingPayload = {
    pricing_method: "package" as const,
    quantity: pricingQuantity,
    unit: pricingUnit,
    cost_rate: costRate,
    sell_rate: sellRate,
    sell_rate_overridden: false,
    markup_percentage: null,
    margin_percentage: marginPercentage,
    total_cost: totalCost,
    total_sell: totalSell,
    gross_profit: grossProfit,
    notes: `Assembly package: ${assemblyPackage.name}`,
  };

  let pricingItemId: string;

  if (existingPricing) {
    const { error: updatePricingError } = await updatePricingItemWithFallback(
      supabase,
      existingPricing.id,
      projectId,
      organisationId,
      {
        full: pricingPayload,
        base: Object.fromEntries(
          Object.entries(pricingPayload).filter(
            ([key]) => key !== "sell_rate_overridden"
          )
        ),
      }
    );

    if (updatePricingError) {
      return { error: formatSupabaseError({ message: updatePricingError }) };
    }

    pricingItemId = existingPricing.id;
  } else {
    const sharedInsert = {
      organisation_id: organisationId,
      project_id: projectId,
      takeoff_item_id: input.takeoff_item_id,
      ...pricingPayload,
    };

    const { pricingItemId: insertedId, error: insertPricingError } =
      await insertPricingItemWithFallback(supabase, {
        full: sharedInsert,
        base: Object.fromEntries(
          Object.entries(sharedInsert).filter(
            ([key]) => key !== "sell_rate_overridden"
          )
        ),
      });

    if (insertPricingError) {
      return { error: formatSupabaseError({ message: insertPricingError }) };
    }

    if (!insertedId) {
      return { error: "Failed to save pricing from package." };
    }

    pricingItemId = insertedId;
  }

  await syncTakeoffItemPricingStatus(
    input.takeoff_item_id,
    projectId,
    organisationId,
    "priced"
  );
  await syncProjectPricingTotals(projectId, organisationId);

  const generated = await regenerateEstimateForTakeoff(supabase, {
    organisationId,
    projectId,
    takeoffItemId: input.takeoff_item_id,
    takeoffQuantity: pricingQuantity,
    assemblyPackage,
  });

  if (generated.error) {
    return { error: generated.error };
  }

  if (generated.componentCount === 0) {
    return {
      error:
        "Package applied and pricing saved, but this package has no components. Add material or labour lines in Templates, then apply again.",
    };
  }

  if (generated.materialCount === 0 && generated.labourCount === 0) {
    return {
      error:
        "Package applied and pricing saved, but no material or labour components were found (only allowance, plant, or subcontractor lines). Add material or labour components in Templates, then apply again.",
    };
  }

  revalidatePath(`/projects/${projectId}`);

  return {
    takeoffItemAssemblyId,
    pricingItemId,
    materialCount: generated.materialCount,
    labourCount: generated.labourCount,
  };
}

export async function removeAssemblyPackageFromTakeoffAction(
  projectId: string,
  takeoffItemId: string
): Promise<RemoveAssemblyPackageResult> {
  if (!projectId || !takeoffItemId) {
    return { error: "Takeoff item not found." };
  }

  const session = await requireApplyPackageSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const organisationId = session.profile.organisation_id;
  const supabase = await createClient();

  const { data: takeoff, error: takeoffError } = await supabase
    .from("takeoff_items")
    .select("id, project_id, organisation_id")
    .eq("id", takeoffItemId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (takeoffError || !takeoff || takeoff.project_id !== projectId) {
    return { error: "Takeoff item not found." };
  }

  const cleared = await clearGeneratedEstimateForTakeoff(
    supabase,
    takeoffItemId,
    projectId,
    organisationId
  );

  if (cleared.error) {
    return { error: cleared.error };
  }

  const { error: assemblyDeleteError } = await supabase
    .from("takeoff_item_assemblies")
    .delete()
    .eq("takeoff_item_id", takeoffItemId)
    .eq("organisation_id", organisationId);

  if (assemblyDeleteError) {
    return { error: formatSupabaseError(assemblyDeleteError) };
  }

  const { data: packagePricing } = await supabase
    .from("pricing_items")
    .select("id")
    .eq("takeoff_item_id", takeoffItemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .eq("pricing_method", "package")
    .maybeSingle();

  if (packagePricing) {
    const { error: pricingDeleteError } = await supabase
      .from("pricing_items")
      .delete()
      .eq("id", packagePricing.id)
      .eq("organisation_id", organisationId);

    if (pricingDeleteError) {
      return { error: formatSupabaseError(pricingDeleteError) };
    }

    await syncTakeoffItemPricingStatus(
      takeoffItemId,
      projectId,
      organisationId,
      "revert"
    );
    await syncProjectPricingTotals(projectId, organisationId);
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}
