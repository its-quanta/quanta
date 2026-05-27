"use client";

import { useState } from "react";

import { ImportHistoryTable } from "@/components/imports/import-history-table";
import { ImportWizard } from "@/components/imports/import-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ImportBatchWithUser } from "@/src/lib/imports/queries";

type ImportsWorkspaceProps = {
  history: ImportBatchWithUser[];
};

export function ImportsWorkspace({ history }: ImportsWorkspaceProps) {
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <div className="flex flex-col gap-8">
      <ImportWizard onComplete={() => setHistoryKey((value) => value + 1)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import history</CardTitle>
          <CardDescription>
            Organisation-scoped audit of bulk imports. Only your company data is
            visible here.
          </CardDescription>
        </CardHeader>
        <CardContent key={historyKey}>
          <ImportHistoryTable batches={history} />
        </CardContent>
      </Card>
    </div>
  );
}
