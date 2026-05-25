"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AssemblyComponentsTable } from "@/components/assemblies/assembly-components-table";
import {
  AssemblyPackageFormFields,
  assemblyPackageToFormValues,
  defaultAssemblyPackageFormValues,
  parseAssemblyPackageForm,
  type AssemblyPackageFormValues,
} from "@/components/assemblies/assembly-package-form-fields";
import { AssemblySummaryCard } from "@/components/assemblies/assembly-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAssemblyPackageAction } from "@/src/lib/assemblies/actions";
import type { AssemblyPackage, AssemblyPackageItem } from "@/src/types/database";

/*
 * TODO: Apply assembly to takeoff item (set pricing_package_id on takeoff_items).
 * TODO: Generate material_lines from assembly explosion.
 * TODO: Generate labour_lines from assembly explosion.
 * TODO: Suggest assembly using AI from takeoff descriptions.
 * TODO: Link to standards_reference table for package citations.
 */

type AssemblyDetailWorkspaceProps = {
  assemblyPackage: AssemblyPackage;
  items: AssemblyPackageItem[];
};

export function AssemblyDetailWorkspace({
  assemblyPackage,
  items,
}: AssemblyDetailWorkspaceProps) {
  const router = useRouter();
  const [form, setForm] = useState<AssemblyPackageFormValues>(
    assemblyPackageToFormValues(assemblyPackage)
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = parseAssemblyPackageForm(form);
    if (parsed.error || !parsed.data) {
      setError(parsed.error ?? "Invalid form.");
      return;
    }

    const payload = parsed.data;

    startTransition(async () => {
      const result = await updateAssemblyPackageAction(
        assemblyPackage.id,
        payload
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess("Assembly saved.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <AssemblySummaryCard
        assemblyPackage={assemblyPackage}
        componentCount={items.length}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assembly details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Package header, pricing behaviour, and references.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <AssemblyPackageFormFields
              values={form}
              onChange={setForm}
              showStatus
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="text-sm text-muted-foreground">{success}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save assembly"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/templates">Back to list</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Components</CardTitle>
        </CardHeader>
        <CardContent>
          <AssemblyComponentsTable
            packageId={assemblyPackage.id}
            packageUnit={assemblyPackage.unit}
            initialItems={items}
          />
        </CardContent>
      </Card>
    </div>
  );
}
