import { DEFAULT_ORGANISATION_CURRENCY } from "@/src/lib/organisations/constants";
import type { Organisation, OrganisationCurrency } from "@/src/types/database";

export type OrganisationSettingsSnapshot = Pick<
  Organisation,
  | "id"
  | "name"
  | "country"
  | "currency"
  | "tax_rate"
  | "default_margin_percentage"
  | "default_markup_percentage"
  | "default_labour_cost_rate"
  | "default_labour_charge_rate"
>;

export function resolveOrganisationCurrency(
  organisation: Pick<Organisation, "currency"> | null | undefined
): OrganisationCurrency {
  return organisation?.currency ?? DEFAULT_ORGANISATION_CURRENCY;
}

export function toOrganisationSettingsSnapshot(
  organisation: Organisation
): OrganisationSettingsSnapshot {
  return {
    id: organisation.id,
    name: organisation.name,
    country: organisation.country,
    currency: organisation.currency,
    tax_rate: organisation.tax_rate,
    default_margin_percentage: organisation.default_margin_percentage,
    default_markup_percentage: organisation.default_markup_percentage,
    default_labour_cost_rate: organisation.default_labour_cost_rate,
    default_labour_charge_rate: organisation.default_labour_charge_rate,
  };
}
