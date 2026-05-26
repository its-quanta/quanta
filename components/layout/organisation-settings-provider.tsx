"use client";

import { createContext, useContext } from "react";

import { resolveOrganisationCurrency } from "@/src/lib/organisations/settings";
import type { OrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";
import type { OrganisationCurrency } from "@/src/types/database";

type OrganisationSettingsContextValue = {
  settings: OrganisationSettingsSnapshot;
  currency: OrganisationCurrency;
};

const OrganisationSettingsContext =
  createContext<OrganisationSettingsContextValue | null>(null);

type OrganisationSettingsProviderProps = {
  settings: OrganisationSettingsSnapshot;
  children: React.ReactNode;
};

export function OrganisationSettingsProvider({
  settings,
  children,
}: OrganisationSettingsProviderProps) {
  const currency = resolveOrganisationCurrency(settings);

  return (
    <OrganisationSettingsContext.Provider value={{ settings, currency }}>
      {children}
    </OrganisationSettingsContext.Provider>
  );
}

export function useOrganisationSettings(): OrganisationSettingsContextValue {
  const context = useContext(OrganisationSettingsContext);
  if (!context) {
    throw new Error(
      "useOrganisationSettings must be used within OrganisationSettingsProvider"
    );
  }
  return context;
}

export function useOrganisationCurrency(): OrganisationCurrency {
  return useOrganisationSettings().currency;
}
