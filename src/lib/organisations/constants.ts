import type { OrganisationCountry, OrganisationCurrency } from "@/src/types/database";

export const ORGANISATION_CURRENCIES: readonly {
  value: OrganisationCurrency;
  label: string;
}[] = [
  { value: "NZD", label: "NZD — New Zealand dollar" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "GBP", label: "GBP — Pound sterling" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
] as const;

export const ORGANISATION_COUNTRIES: readonly {
  value: OrganisationCountry;
  label: string;
}[] = [
  { value: "new_zealand", label: "New Zealand" },
  { value: "australia", label: "Australia" },
  { value: "united_kingdom", label: "United Kingdom" },
  { value: "united_states", label: "United States" },
  { value: "europe", label: "Europe" },
  { value: "other", label: "Other" },
] as const;

export const DEFAULT_ORGANISATION_CURRENCY: OrganisationCurrency = "NZD";

export const NEW_ZEALAND_DEFAULTS = {
  country: "new_zealand" as const,
  currency: "NZD" as const,
  tax_rate: 15,
};

const COUNTRY_CURRENCY: Partial<Record<OrganisationCountry, OrganisationCurrency>> =
  {
    new_zealand: "NZD",
    australia: "AUD",
    united_kingdom: "GBP",
    united_states: "USD",
    europe: "EUR",
  };

export function currencyForCountry(
  country: OrganisationCountry | null | undefined
): OrganisationCurrency | null {
  if (!country) {
    return null;
  }
  return COUNTRY_CURRENCY[country] ?? null;
}

export function isOrganisationCurrency(
  value: string
): value is OrganisationCurrency {
  return ORGANISATION_CURRENCIES.some((option) => option.value === value);
}

export function isOrganisationCountry(
  value: string
): value is OrganisationCountry {
  return ORGANISATION_COUNTRIES.some((option) => option.value === value);
}

export function formatOrganisationCountryLabel(
  country: OrganisationCountry | null | undefined
): string {
  if (!country) {
    return "—";
  }
  return (
    ORGANISATION_COUNTRIES.find((option) => option.value === country)?.label ??
    country
  );
}
