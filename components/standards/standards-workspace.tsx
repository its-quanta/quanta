"use client";

import { StandardsTable } from "@/components/standards/standards-table";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Standard } from "@/src/types/database";

type StandardsWorkspaceProps = {
  standards: Standard[];
};

export function StandardsWorkspace({ standards }: StandardsWorkspaceProps) {
  const activeCount = standards.filter((row) => row.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total standards</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {standards.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-emerald-700">
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {standards.length - activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standards library</CardTitle>
          <CardDescription>
            Reference codes for NZ standards, building code clauses,
            specifications, and project citations. Link standards to takeoff
            lines, assemblies, and pricing.
          </CardDescription>
        </CardHeader>
        <StandardsTable initialStandards={standards} />
      </Card>
    </div>
  );
}
