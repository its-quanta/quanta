"use client";

import { useActionState } from "react";

import {
  createOrganisationAction,
  type OnboardingActionState,
} from "@/src/lib/auth/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardingActionState = {};

type CreateOrganisationFormProps = {
  defaultFullName?: string | null;
};

export function CreateOrganisationForm({
  defaultFullName,
}: CreateOrganisationFormProps) {
  const [state, formAction, isPending] = useActionState(
    createOrganisationAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          name="companyName"
          required
          placeholder="Morgan Joinery Ltd"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="createFullName">Full name</Label>
        <Input
          id="createFullName"
          name="fullName"
          required
          defaultValue={defaultFullName ?? ""}
          placeholder="Alex Morgan"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-9 w-full" disabled={isPending}>
        {isPending ? "Creating organisation…" : "Create organisation"}
      </Button>
    </form>
  );
}
