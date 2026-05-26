"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download04Icon } from "@hugeicons/core-free-icons";

import { ExportToast } from "@/components/export/export-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildExport } from "@/src/lib/export/build-export-data";
import {
  estimateExportSizeBytes,
  formatFileSize,
} from "@/src/lib/export/filename";
import { readExportMeta } from "@/src/lib/export/export-storage";
import { runProjectExport } from "@/src/lib/export/run-export";
import {
  EXPORT_TYPES,
  type ExportProjectData,
  type ExportType,
  type StoredExportMeta,
} from "@/src/lib/export/types";
import { formatDateTime } from "@/src/lib/format";

type SubmissionExportSectionProps = {
  exportData: ExportProjectData;
};

export function SubmissionExportSection({
  exportData,
}: SubmissionExportSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [activeExport, setActiveExport] = useState<ExportType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastExports, setLastExports] = useState<
    Partial<Record<ExportType, StoredExportMeta | null>>
  >({});

  useEffect(() => {
    const next: Partial<Record<ExportType, StoredExportMeta | null>> = {};
    for (const entry of EXPORT_TYPES) {
      next[entry.id] = readExportMeta(exportData.project.id, entry.id);
    }
    setLastExports(next);
  }, [exportData.project.id]);

  const rowCounts = useMemo(() => {
    const counts = {} as Record<ExportType, number>;
    for (const entry of EXPORT_TYPES) {
      counts[entry.id] = buildExport(entry.id, exportData).rowCount;
    }
    return counts;
  }, [exportData]);

  const handleExport = useCallback(
    (exportType: ExportType) => {
      setActiveExport(exportType);
      startTransition(async () => {
        try {
          const result = await runProjectExport(exportType, exportData);
          setLastExports((current) => ({
            ...current,
            [exportType]: readExportMeta(exportData.project.id, exportType),
          }));
          setToastMessage(
            `Export complete — ${result.fileName} (${formatFileSize(result.sizeBytes)})`
          );
        } catch (error) {
          setToastMessage(
            error instanceof Error
              ? error.message
              : "Export failed. Try again."
          );
        } finally {
          setActiveExport(null);
        }
      });
    },
    [exportData]
  );

  return (
    <>
      <section id="submission-export" className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium">Export</h2>
          <p className="text-sm text-muted-foreground">
            Download structured Excel workbooks from saved project data. Files
            are generated in your browser — nothing is stored publicly.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EXPORT_TYPES.map((entry) => {
            const rowCount = rowCounts[entry.id];
            const columnEstimate =
              entry.id === "full-pack" ? 12 : entry.id === "pricing" ? 13 : 8;
            const sizeEstimate = estimateExportSizeBytes(rowCount, columnEstimate);
            const lastExport = lastExports[entry.id];
            const isExporting = isPending && activeExport === entry.id;

            return (
              <Card key={entry.id} size="sm" className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {entry.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {entry.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-3 pt-0">
                  <dl className="grid gap-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Rows</dt>
                      <dd className="font-mono tabular-nums">{rowCount}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Est. size</dt>
                      <dd className="font-mono tabular-nums">
                        ~{formatFileSize(sizeEstimate)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Last export</dt>
                      <dd className="text-right text-foreground">
                        {lastExport
                          ? formatDateTime(lastExport.exportedAt)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={isPending || rowCount === 0}
                    onClick={() => handleExport(entry.id)}
                  >
                    <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
                    {isExporting ? "Exporting…" : "Export Excel"}
                  </Button>
                  {rowCount === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No rows available for this export yet.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <ExportToast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </>
  );
}
