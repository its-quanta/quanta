"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACTIVE_IMPORT_DEFINITIONS } from "@/src/lib/imports/definitions";
import { formatDateTime } from "@/src/lib/format";
import type { ImportBatchWithUser } from "@/src/lib/imports/queries";

type ImportHistoryTableProps = {
  batches: ImportBatchWithUser[];
};

export function ImportHistoryTable({ batches }: ImportHistoryTableProps) {
  if (batches.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        No imports recorded yet. Completed imports appear here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Import type</TableHead>
            <TableHead className="text-right">Imported</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead>Imported by</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const label =
              ACTIVE_IMPORT_DEFINITIONS.find((d) => d.id === batch.import_type)
                ?.title ?? batch.import_type;

            return (
              <TableRow key={batch.id}>
                <TableCell className="font-medium">{label}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {batch.rows_imported}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {batch.rows_failed}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {batch.imported_by_email ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(batch.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
