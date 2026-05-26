"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  currencyForCountry,
  ORGANISATION_COUNTRIES,
  ORGANISATION_CURRENCIES,
} from "@/src/lib/organisations/constants";
import {
  updateOrganisationSettingsAction,
  type UpdateOrganisationSettingsState,
} from "@/src/lib/organisations/actions";
import type { Organisation, OrganisationCountry } from "@/src/types/database";

const initialState: UpdateOrganisationSettingsState = {};

const selectClassName = cn(
  "h-9 w-full rounded-md border border-input bg-input/20 px-2.5 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function formatOptionalNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

type OrganisationSettingsFormProps = {
  organisation: Organisation;
};

export function OrganisationSettingsForm({
  organisation,
}: OrganisationSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrganisationSettingsAction,
    initialState
  );
  const [country, setCountry] = useState<OrganisationCountry | "">(
    organisation.country ?? ""
  );
  const [currency, setCurrency] = useState(organisation.currency ?? "");

  const suggestedCurrency = useMemo(
    () => (country ? currencyForCountry(country as OrganisationCountry) : null),
    [country]
  );

  function handleCountryChange(nextCountry: string) {
    setCountry(nextCountry as OrganisationCountry | "");
    const mapped = currencyForCountry(nextCountry as OrganisationCountry);
    if (mapped) {
      setCurrency(mapped);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organisation settings</CardTitle>
        <CardDescription>
          Company profile, location, currency, and default estimating values for
          your organisation.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={organisation.name}
                placeholder="Your company name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country">Country / location</Label>
              <select
                id="country"
                name="country"
                className={selectClassName}
                value={country}
                onChange={(event) => handleCountryChange(event.target.value)}
              >
                <option value="">Select location</option>
                {ORGANISATION_COUNTRIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {suggestedCurrency && currency !== suggestedCurrency ? (
                <p className="text-xs text-muted-foreground">
                  Typical currency for this location: {suggestedCurrency}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                className={selectClassName}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option value="">Select currency</option>
                {ORGANISATION_CURRENCIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxRate">Tax / GST rate (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                defaultValue={formatOptionalNumber(organisation.tax_rate)}
                placeholder="15"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultMarginPercentage">Default margin (%)</Label>
              <Input
                id="defaultMarginPercentage"
                name="defaultMarginPercentage"
                type="number"
                min={0}
                max={99.9}
                step="0.1"
                defaultValue={formatOptionalNumber(
                  organisation.default_margin_percentage
                )}
                placeholder="25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultMarkupPercentage">Default markup (%)</Label>
              <Input
                id="defaultMarkupPercentage"
                name="defaultMarkupPercentage"
                type="number"
                min={0}
                step="0.1"
                defaultValue={formatOptionalNumber(
                  organisation.default_markup_percentage
                )}
                placeholder="33.3"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultLabourCostRate">
                Default labour cost rate
              </Label>
              <Input
                id="defaultLabourCostRate"
                name="defaultLabourCostRate"
                type="number"
                min={0}
                step="0.01"
                defaultValue={formatOptionalNumber(
                  organisation.default_labour_cost_rate
                )}
                placeholder="65"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultLabourChargeRate">
                Default labour charge rate
              </Label>
              <Input
                id="defaultLabourChargeRate"
                name="defaultLabourChargeRate"
                type="number"
                min={0}
                step="0.01"
                defaultValue={formatOptionalNumber(
                  organisation.default_labour_charge_rate
                )}
                placeholder="95"
              />
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-700" role="status">
              Organisation settings saved.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t border-border">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
