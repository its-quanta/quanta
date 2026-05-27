import type { CommandIndexEntry, CommandResult } from "@/src/lib/command/types";

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function scoreEntry(entry: CommandIndexEntry, query: string): number {
  const q = normalise(query);
  if (!q) {
    return 0;
  }

  const label = normalise(entry.label);
  const text = normalise(entry.searchText);

  if (label === q) {
    return 100;
  }
  if (label.startsWith(q)) {
    return 80;
  }
  if (label.includes(q)) {
    return 60;
  }
  if (text.includes(q)) {
    return 40;
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((token) => text.includes(token))) {
    return 30;
  }

  return 0;
}

export function searchCommandIndex(
  entries: CommandIndexEntry[],
  query: string,
  limit = 40
): CommandIndexEntry[] {
  const q = query.trim();
  if (!q) {
    return [];
  }

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map((row) => row.entry);
}

const KIND_GROUP_LABELS: Record<CommandIndexEntry["kind"], string> = {
  project: "Projects",
  takeoff: "Takeoff",
  package: "Methodologies",
  pricing: "Pricing",
  material: "Materials",
  labour: "Labour",
  standard: "Standards",
  clarification: "Clarifications",
  rfi: "RFIs",
  exclusion: "Exclusions",
  assumption: "Assumptions",
  document: "Documents",
  labour_rate: "Labour rates",
  material_rate: "Material rates",
  supplier_rate: "Supplier rates",
  subcontractor_rate: "Subcontractor rates",
  user: "Team",
  navigation: "Navigate",
  create: "Create",
};

export function groupLabelForKind(kind: CommandIndexEntry["kind"]): string {
  return KIND_GROUP_LABELS[kind] ?? "Results";
}

export function entryToOpenResult(
  entry: CommandIndexEntry,
  action: CommandResult["action"] = "open"
): CommandResult {
  return {
    id: `${entry.id}-${action}`,
    action,
    label: action === "open" ? `Open ${entry.label}` : entry.label,
    hint: entry.subtitle,
    group: groupLabelForKind(entry.kind),
    keywords: entry.searchText,
    entry,
    pinKey: entry.entityId
      ? `${entry.kind}:${entry.projectId ?? ""}:${entry.entityId}`
      : entry.id,
  };
}
