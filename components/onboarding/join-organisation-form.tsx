"use client";

import { useActionState } from "react";

import {
  joinOrganisationAction,
  type OnboardingActionState,
} from "@/src/lib/auth/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardingActionState = {};

type JoinOrganisationFormProps = {
  defaultFullName?: string | null;
};

export function JoinOrganisationForm({
  defaultFullName,
}: JoinOrganisationFormProps) {
  const [state, formAction, isPending] = useActionState(
    joinOrganisationAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inviteToken">Invite token</Label>
        <Input
          id="inviteToken"
          name="inviteToken"
          required
          placeholder="Paste your organisation invite token"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Provided by your organisation owner or admin.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="joinFullName">Full name</Label>
        <Input
          id="joinFullName"
          name="fullName"
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
        {isPending ? "Joining organisation…" : "Join organisation"}
      </Button>
    </form>
  );
}
