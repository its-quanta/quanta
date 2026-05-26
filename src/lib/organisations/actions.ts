"use server";

import { revalidatePath } from "next/cache";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import {
  isOrganisationCountry,
  isOrganisationCurrency,
} from "@/src/lib/organisations/constants";
import { mapOrganisationRow } from "@/src/lib/organisations/queries";
import { createClient } from "@/src/lib/supabase/server";

export type UpdateOrganisationSettingsState = {
  error?: string;
  success?: boolean;
};

function optionalString(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function optionalNumber(
  value: FormDataEntryValue | null
): number | null | undefined {
  const text = String(value ?? "").trim();
  if (text.length === 0) {
    return null;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

export async function updateOrganisationSettingsAction(
  _prevState: UpdateOrganisationSettingsState,
  formData: FormData
): Promise<UpdateOrganisationSettingsState> {
  const name = String(formData.get("name") ?? "").trim();
  const country = optionalString(formData.get("country"));
  const currency = optionalString(formData.get("currency"));

  if (!name) {
    return { error: "Company name is required." };
  }

  if (country && !isOrganisationCountry(country)) {
    return { error: "Select a valid location." };
  }

  if (currency && !isOrganisationCurrency(currency)) {
    return { error: "Select a valid currency." };
  }

  const taxRate = optionalNumber(formData.get("taxRate"));
  const defaultMargin = optionalNumber(formData.get("defaultMarginPercentage"));
  const defaultMarkup = optionalNumber(formData.get("defaultMarkupPercentage"));
  const defaultLabourCost = optionalNumber(formData.get("defaultLabourCostRate"));
  const defaultLabourCharge = optionalNumber(
    formData.get("defaultLabourChargeRate")
  );

  if (taxRate === undefined) {
    return { error: "Tax / GST rate must be a number." };
  }
  if (defaultMargin === undefined) {
    return { error: "Default margin must be a number." };
  }
  if (defaultMarkup === undefined) {
    return { error: "Default markup must be a number." };
  }
  if (defaultLabourCost === undefined) {
    return { error: "Default labour cost rate must be a number." };
  }
  if (defaultLabourCharge === undefined) {
    return { error: "Default labour charge rate must be a number." };
  }

  if (taxRate !== null && (taxRate < 0 || taxRate > 100)) {
    return { error: "Tax / GST rate must be between 0 and 100." };
  }
  if (
    defaultMargin !== null &&
    (defaultMargin < 0 || defaultMargin >= 100)
  ) {
    return { error: "Default margin must be between 0 and 99.9." };
  }
  if (defaultMarkup !== null && defaultMarkup < 0) {
    return { error: "Default markup cannot be negative." };
  }
  if (defaultLabourCost !== null && defaultLabourCost < 0) {
    return { error: "Default labour cost rate cannot be negative." };
  }
  if (defaultLabourCharge !== null && defaultLabourCharge < 0) {
    return { error: "Default labour charge rate cannot be negative." };
  }

  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const payload = {
    name,
    country,
    currency,
    tax_rate: taxRate,
    default_margin_percentage: defaultMargin,
    default_markup_percentage: defaultMarkup,
    default_labour_cost_rate: defaultLabourCost,
    default_labour_charge_rate: defaultLabourCharge,
  };

  const { data, error } = await supabase
    .from("organisations")
    .update(payload)
    .eq("id", profile.organisation_id)
    .select(
      "id, name, country, currency, tax_rate, default_margin_percentage, default_markup_percentage, default_labour_cost_rate, default_labour_charge_rate, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    if (error.message.includes("column")) {
      return {
        error:
          "Organisation settings columns are missing. Run the latest database migration, then try again.",
      };
    }
    return { error: error.message };
  }

  if (!data) {
    return { error: "Could not save organisation settings." };
  }

  void mapOrganisationRow(data as Record<string, unknown>);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/projects", "layout");

  return { success: true };
}
