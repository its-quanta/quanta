import type { OrganisationCurrency } from "@/src/types/database";

import { DEFAULT_ORGANISATION_CURRENCY } from "@/src/lib/organisations/constants";

const LOCALE_BY_CURRENCY: Record<OrganisationCurrency, string> = {
  NZD: "en-NZ",
  AUD: "en-AU",
  GBP: "en-GB",
  USD: "en-US",
  EUR: "en-GB",
};

const formatterCache = new Map<OrganisationCurrency, Intl.NumberFormat>();

function getCurrencyFormatter(
  currency: OrganisationCurrency
): Intl.NumberFormat {
  const cached = formatterCache.get(currency);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  formatterCache.set(currency, formatter);
  return formatter;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: OrganisationCurrency | null | undefined = DEFAULT_ORGANISATION_CURRENCY
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const code = currency ?? DEFAULT_ORGANISATION_CURRENCY;
  return getCurrencyFormatter(code).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const due = new Date(value);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
