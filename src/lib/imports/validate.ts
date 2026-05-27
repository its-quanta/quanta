import { getImportDefinition } from "@/src/lib/imports/definitions";
import type {
  ColumnMapping,
  ImportType,
  ImportValidationIssue,
} from "@/src/lib/imports/types";

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function isValidClarificationTemplateType(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  return normalised === "exclusion" || normalised === "assumption";
}

function isValidComponentType(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  return ["material", "labour", "plant", "subcontractor", "allowance"].includes(
    normalised
  );
}

export function applyColumnMappings(
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const mapping of mappings) {
      if (!mapping.destinationField) {
        continue;
      }
      mapped[mapping.destinationField] = row[mapping.sourceColumn] ?? "";
    }
    return mapped;
  });
}

export function validateImportRows(
  importType: ImportType,
  mappedRows: Record<string, string>[]
): ImportValidationIssue[] {
  const definition = getImportDefinition(importType);
  if (!definition) {
    return [
      {
        id: "unknown-type",
        severity: "critical",
        message: "Unknown import type.",
      },
    ];
  }

  const issues: ImportValidationIssue[] = [];
  const requiredFields = definition.fields.filter((field) => field.required);
  const seenKeys = new Map<string, number>();

  if (mappedRows.length === 0) {
    issues.push({
      id: "no-rows",
      severity: "critical",
      message: "No data rows found in the file.",
    });
    return issues;
  }

  for (const field of requiredFields) {
    const mapped = mappedRows.some((row) => row[field.key]?.trim());
    if (!mapped) {
      issues.push({
        id: `missing-column-${field.key}`,
        severity: "critical",
        message: `Required field "${field.label}" is not mapped.`,
        field: field.key,
      });
    }
  }

  mappedRows.forEach((row, index) => {
    const rowNumber = index + 2;

    for (const field of requiredFields) {
      if (!row[field.key]?.trim()) {
        issues.push({
          id: `row-${rowNumber}-required-${field.key}`,
          severity: "critical",
          message: `Row ${rowNumber}: ${field.label} is required.`,
          rowNumber,
          field: field.key,
        });
      }
    }

    if (importType === "labour_rates" || importType === "material_rates") {
      const cost = parseNumber(row.cost_rate ?? "");
      if (row.cost_rate?.trim() && cost === null) {
        issues.push({
          id: `row-${rowNumber}-cost`,
          severity: "critical",
          message: `Row ${rowNumber}: cost rate must be a number.`,
          rowNumber,
          field: "cost_rate",
        });
      }
      if (cost !== null && cost < 0) {
        issues.push({
          id: `row-${rowNumber}-cost-negative`,
          severity: "critical",
          message: `Row ${rowNumber}: cost rate cannot be negative.`,
          rowNumber,
        });
      }
    }

    if (importType === "material_rates") {
      const waste = parseNumber(row.waste_percent ?? "");
      if (row.waste_percent?.trim() && waste === null) {
        issues.push({
          id: `row-${rowNumber}-waste`,
          severity: "warning",
          message: `Row ${rowNumber}: waste % is not a valid number.`,
          rowNumber,
        });
      }
      if (waste !== null && (waste < 0 || waste > 100)) {
        issues.push({
          id: `row-${rowNumber}-waste-range`,
          severity: "critical",
          message: `Row ${rowNumber}: waste % must be between 0 and 100.`,
          rowNumber,
        });
      }
    }

    if (importType === "supplier_rates" || importType === "subcontractor_rates") {
      const rate = parseNumber(row.rate ?? "");
      if (row.rate?.trim() && rate === null) {
        issues.push({
          id: `row-${rowNumber}-rate`,
          severity: "critical",
          message: `Row ${rowNumber}: rate must be a number.`,
          rowNumber,
        });
      }
    }

    if (importType === "packages") {
      const margin = parseNumber(row.margin ?? "");
      const markup = parseNumber(row.markup ?? "");
      if (row.margin?.trim() && margin === null) {
        issues.push({
          id: `row-${rowNumber}-margin`,
          severity: "warning",
          message: `Row ${rowNumber}: margin % is not a valid number.`,
          rowNumber,
        });
      }
      if (row.markup?.trim() && markup === null) {
        issues.push({
          id: `row-${rowNumber}-markup`,
          severity: "warning",
          message: `Row ${rowNumber}: markup % is not a valid number.`,
          rowNumber,
        });
      }
    }

    if (importType === "package_components") {
      if (
        row.component_type?.trim() &&
        !isValidComponentType(row.component_type)
      ) {
        issues.push({
          id: `row-${rowNumber}-component-type`,
          severity: "critical",
          message: `Row ${rowNumber}: component type must be material, labour, plant, subcontractor, or allowance.`,
          rowNumber,
        });
      }
      const qty = parseNumber(row.quantity_per_unit ?? "");
      if (row.quantity_per_unit?.trim() && qty === null) {
        issues.push({
          id: `row-${rowNumber}-qty`,
          severity: "critical",
          message: `Row ${rowNumber}: quantity per unit must be a number.`,
          rowNumber,
        });
      }
    }

    if (importType === "clarification_templates") {
      if (row.type?.trim() && !isValidClarificationTemplateType(row.type)) {
        issues.push({
          id: `row-${rowNumber}-type`,
          severity: "critical",
          message: `Row ${rowNumber}: type must be exclusion or assumption for templates.`,
          rowNumber,
        });
      }
      if (row.priority?.trim()) {
        issues.push({
          id: `row-${rowNumber}-priority-info`,
          severity: "info",
          message: `Row ${rowNumber}: priority is stored in notes only for templates in this release.`,
          rowNumber,
        });
      }
    }

    const duplicateKey = buildDuplicateKey(importType, row);
    if (duplicateKey) {
      const firstRow = seenKeys.get(duplicateKey);
      if (firstRow !== undefined) {
        issues.push({
          id: `duplicate-${duplicateKey}-${rowNumber}`,
          severity: "warning",
          message: `Row ${rowNumber}: duplicate of row ${firstRow} (${duplicateKey}).`,
          rowNumber,
        });
      } else {
        seenKeys.set(duplicateKey, rowNumber);
      }
    }
  });

  return issues;
}

function buildDuplicateKey(
  importType: ImportType,
  row: Record<string, string>
): string | null {
  switch (importType) {
    case "labour_rates":
    case "material_rates":
      return row.name?.trim().toLowerCase() ?? null;
    case "supplier_rates":
      return `${row.supplier?.trim().toLowerCase()}|${row.item?.trim().toLowerCase()}`;
    case "subcontractor_rates":
      return `${row.trade?.trim().toLowerCase()}|${row.supplier?.trim().toLowerCase() ?? ""}`;
    case "packages":
      return row.name?.trim().toLowerCase() ?? null;
    case "package_components":
      return `${row.package?.trim().toLowerCase()}|${row.item_name?.trim().toLowerCase()}`;
    case "standards":
      return row.reference_code?.trim().toLowerCase() ?? null;
    case "clarification_templates":
      return `${row.type?.trim().toLowerCase()}|${row.title?.trim().toLowerCase()}`;
    default:
      return null;
  }
}

export function hasBlockingImportIssues(issues: ImportValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "critical");
}
