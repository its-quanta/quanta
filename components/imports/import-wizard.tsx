"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download04Icon, Upload04Icon } from "@hugeicons/core-free-icons";

import { ImportToast } from "@/components/imports/import-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ACTIVE_IMPORT_DEFINITIONS,
  ALL_IMPORT_CARDS,
  getImportDefinition,
} from "@/src/lib/imports/definitions";
import { executeBulkImportAction } from "@/src/lib/imports/execute";
import { parseImportFile } from "@/src/lib/imports/parse-file";
import { suggestColumnMappings } from "@/src/lib/imports/suggest-mapping";
import {
  downloadFailureReport,
  downloadImportTemplate,
} from "@/src/lib/imports/templates";
import {
  applyColumnMappings,
  hasBlockingImportIssues,
  validateImportRows,
} from "@/src/lib/imports/validate";
import type {
  ColumnMapping,
  DuplicateStrategy,
  ImportExecutionResult,
  ImportType,
  ParsedImportFile,
} from "@/src/lib/imports/types";

const STEPS = [
  "Select type",
  "Upload file",
  "Preview",
  "Field mapping",
  "Validation",
  "Complete",
] as const;

type WizardStep = (typeof STEPS)[number];

type ImportWizardProps = {
  onComplete?: () => void;
};

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("Select type");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedImportFile | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<DuplicateStrategy>("skip");
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const definition = importType ? getImportDefinition(importType) : undefined;

  const mappedRows = useMemo(() => {
    if (!parsedFile) {
      return [];
    }
    return applyColumnMappings(parsedFile.rows, mappings);
  }, [parsedFile, mappings]);

  const validationIssues = useMemo(() => {
    if (!importType) {
      return [];
    }
    return validateImportRows(importType, mappedRows);
  }, [importType, mappedRows]);

  const stepIndex = STEPS.indexOf(step);

  const resetWizard = useCallback(() => {
    setStep("Select type");
    setImportType(null);
    setParsedFile(null);
    setMappings([]);
    setDuplicateStrategy("skip");
    setParseError(null);
    setResult(null);
  }, []);

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const parsed = await parseImportFile(file);
      if (!importType || !definition) {
        return;
      }
      setParsedFile(parsed);
      const suggested = suggestColumnMappings(parsed.columns, definition.fields);
      setMappings(
        parsed.columns.map((column) => ({
          sourceColumn: column,
          destinationField: suggested[column] ?? null,
        }))
      );
      setStep("Preview");
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Could not read file."
      );
    }
  }

  function handleImport() {
    if (!importType || hasBlockingImportIssues(validationIssues)) {
      return;
    }

    startTransition(async () => {
      const execution = await executeBulkImportAction({
        importType,
        duplicateStrategy,
        rows: mappedRows,
      });

      if (execution.error) {
        setToast(execution.error);
        return;
      }

      setResult({
        imported: execution.imported,
        failed: execution.failed,
        failures: execution.failures,
        batchId: execution.batchId,
      });
      setStep("Complete");
      setToast(
        `Import complete — ${execution.imported} row${execution.imported === 1 ? "" : "s"} imported.`
      );
      router.refresh();
      onComplete?.();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((label, index) => (
            <Badge
              key={label}
              variant="outline"
              className={cn(
                index === stepIndex && "border-primary/50 bg-primary/5 text-primary",
                index < stepIndex && "text-muted-foreground"
              )}
            >
              {index + 1}. {label}
            </Badge>
          ))}
        </div>

        {step === "Select type" ? (
          <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ALL_IMPORT_CARDS.map((card) => (
              <Card
                key={card.id}
                className={cn(
                  card.placeholder && "opacity-60",
                  !card.placeholder && "cursor-pointer transition-colors hover:border-primary/40",
                  importType === card.id && !card.placeholder && "border-primary/50 ring-1 ring-primary/20"
                )}
                onClick={() => {
                  if (card.placeholder) {
                    return;
                  }
                  setImportType(card.id as ImportType);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{card.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {card.placeholder ? (
                    <Badge variant="outline" className="text-xs">
                      Coming soon
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={importType === card.id ? "default" : "outline"}
                      onClick={(event) => {
                        event.stopPropagation();
                        setImportType(card.id as ImportType);
                        setStep("Upload file");
                      }}
                    >
                      Select
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {importType ? (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep("Upload file")}>
                Continue to upload
              </Button>
            </div>
          ) : null}
          </>
        ) : null}

        {step === "Upload file" && definition ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{definition.title}</CardTitle>
              <CardDescription>
                Upload CSV or XLSX. Download the sample template to match column
                headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label
                className={cn(
                  "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3",
                  "rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10",
                  "hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <HugeiconsIcon
                  icon={Upload04Icon}
                  strokeWidth={2}
                  className="size-8 text-muted-foreground"
                />
                <div className="text-center">
                  <p className="text-sm font-medium">Drop file here or click to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CSV or XLSX · first sheet used for Excel
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleFile(file);
                    }
                  }}
                />
              </label>
              {parseError ? (
                <p className="text-sm text-destructive" role="alert">
                  {parseError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => importType && downloadImportTemplate(importType)}
                >
                  <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
                  Download sample template
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetWizard}>
                  Change import type
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "Preview" && parsedFile ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                {parsedFile.fileName} · {parsedFile.rows.length} rows ·{" "}
                {parsedFile.columns.length} columns
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsedFile.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedFile.rows.slice(0, 8).map((row, index) => (
                      <TableRow key={index}>
                        {parsedFile.columns.map((column) => (
                          <TableCell key={column} className="max-w-[160px] truncate text-xs">
                            {row[column] || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedFile.rows.length > 8 ? (
                <p className="text-xs text-muted-foreground">
                  Showing first 8 of {parsedFile.rows.length} rows.
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" onClick={() => setStep("Field mapping")}>
                  Continue to mapping
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("Upload file")}
                >
                  Re-upload
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "Field mapping" && definition && parsedFile ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Field mapping</CardTitle>
              <CardDescription>
                Map uploaded columns to Quanta fields. Required fields must be mapped.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uploaded column</TableHead>
                      <TableHead>Destination field</TableHead>
                      <TableHead>Example data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping, index) => {
                      const field = definition.fields.find(
                        (f) => f.key === mapping.destinationField
                      );
                      const example =
                        parsedFile.rows[0]?.[mapping.sourceColumn] ?? "—";
                      const status = field
                        ? field.required
                          ? "Required"
                          : "Mapped"
                        : "Unmapped";

                      return (
                        <TableRow key={mapping.sourceColumn}>
                          <TableCell className="font-medium">
                            {mapping.sourceColumn}
                          </TableCell>
                          <TableCell>
                            <select
                              className="h-8 w-full min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
                              value={mapping.destinationField ?? ""}
                              onChange={(event) => {
                                const value = event.target.value || null;
                                setMappings((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, destinationField: value }
                                      : entry
                                  )
                                );
                              }}
                            >
                              <option value="">— Not mapped —</option>
                              {definition.fields.map((fieldOption) => (
                                <option key={fieldOption.key} value={fieldOption.key}>
                                  {fieldOption.label}
                                  {fieldOption.required ? " *" : ""}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {example}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                status === "Required" && "border-primary/40",
                                status === "Unmapped" && "text-muted-foreground"
                              )}
                            >
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => setStep("Validation")}>
                  Validate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("Preview")}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "Validation" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation</CardTitle>
              <CardDescription>
                Review issues before importing. Critical issues block the import.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-md border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">Duplicate handling</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  {(
                    [
                      ["skip", "Skip duplicates"],
                      ["overwrite", "Overwrite duplicates"],
                      ["create_new", "Create new (append suffix)"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        checked={duplicateStrategy === value}
                        onChange={() => setDuplicateStrategy(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {validationIssues.length === 0 ? (
                <p className="text-sm text-emerald-700">
                  No validation issues. Ready to import {mappedRows.length} rows.
                </p>
              ) : (
                <ul className="flex max-h-[280px] flex-col gap-2 overflow-y-auto">
                  {validationIssues.map((issue) => (
                    <li
                      key={issue.id}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        issue.severity === "critical" &&
                          "border-destructive/30 bg-destructive/5 text-destructive",
                        issue.severity === "warning" &&
                          "border-amber-500/30 bg-amber-500/5 text-amber-900",
                        issue.severity === "info" &&
                          "border-border bg-muted/10 text-muted-foreground"
                      )}
                    >
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={isPending || hasBlockingImportIssues(validationIssues)}
                  onClick={handleImport}
                >
                  {isPending ? "Importing…" : `Import ${mappedRows.length} rows`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("Field mapping")}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "Complete" && result ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import complete</CardTitle>
              <CardDescription>
                Summary of the bulk import run.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Rows imported</dt>
                  <dd className="font-mono text-2xl tabular-nums text-emerald-700">
                    {result.imported}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rows failed</dt>
                  <dd
                    className={cn(
                      "font-mono text-2xl tabular-nums",
                      result.failed > 0 ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {result.failed}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Import type</dt>
                  <dd className="text-sm font-medium">
                    {definition?.title ?? importType}
                  </dd>
                </div>
              </dl>

              {result.failures.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    importType &&
                    downloadFailureReport(result.failures, importType)
                  }
                >
                  <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
                  Download failure report
                </Button>
              ) : null}

              <div className="flex gap-2">
                <Button type="button" onClick={resetWizard}>
                  Import another file
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <ImportToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
