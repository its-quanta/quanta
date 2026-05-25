"use client";

import { useState, useTransition } from "react";

import {
  AssemblyPackageFormFields,
  defaultAssemblyPackageFormValues,
  parseAssemblyPackageForm,
  type AssemblyPackageFormValues,
} from "@/components/assemblies/assembly-package-form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAssemblyPackageAndRedirectAction } from "@/src/lib/assemblies/actions";

export function AssemblyCreateForm() {
  const [form, setForm] = useState<AssemblyPackageFormValues>(
    defaultAssemblyPackageFormValues
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = parseAssemblyPackageForm(form);
    if (parsed.error || !parsed.data) {
      setError(parsed.error ?? "Invalid form.");
      return;
    }

    const payload = parsed.data;

    startTransition(async () => {
      const result = await createAssemblyPackageAndRedirectAction(payload);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New assembly</CardTitle>
        <p className="text-sm text-muted-foreground">
          Define the package header first, then add components on the next
          screen.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AssemblyPackageFormFields values={form} onChange={setForm} />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create and add components"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
