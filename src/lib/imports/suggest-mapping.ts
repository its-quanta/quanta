import type { ImportFieldDefinition } from "@/src/lib/imports/types";

function normaliseKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function suggestColumnMappings(
  columns: string[],
  fields: ImportFieldDefinition[]
): Record<string, string | null> {
  const mappings: Record<string, string | null> = {};

  for (const column of columns) {
    const normalisedColumn = normaliseKey(column);
    let matched: string | null = null;

    for (const field of fields) {
      const keys = [field.key, field.label, ...(field.aliases ?? [])];
      if (
        keys.some((candidate) => normaliseKey(candidate) === normalisedColumn)
      ) {
        matched = field.key;
        break;
      }
    }

    mappings[column] = matched;
  }

  return mappings;
}
