import type { StoredCommandItem } from "@/src/lib/command/types";

const RECENTS_KEY = "quanta:command-recents";
const PINS_KEY = "quanta:command-pins";
const MAX_RECENTS = 12;
const MAX_PINS = 16;

function orgKey(base: string, organisationId: string): string {
  return `${base}:${organisationId}`;
}

function readList(key: string): StoredCommandItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredCommandItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key: string, items: StoredCommandItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(items));
}

export function getRecentItems(organisationId: string): StoredCommandItem[] {
  return readList(orgKey(RECENTS_KEY, organisationId));
}

export function recordRecentItem(
  organisationId: string,
  item: StoredCommandItem
): void {
  const key = orgKey(RECENTS_KEY, organisationId);
  const existing = readList(key).filter((row) => row.pinKey !== item.pinKey);
  writeList(key, [item, ...existing].slice(0, MAX_RECENTS));
}

export function getPinnedItems(organisationId: string): StoredCommandItem[] {
  return readList(orgKey(PINS_KEY, organisationId));
}

export function togglePinnedItem(
  organisationId: string,
  item: StoredCommandItem
): boolean {
  const key = orgKey(PINS_KEY, organisationId);
  const existing = readList(key);
  const index = existing.findIndex((row) => row.pinKey === item.pinKey);
  if (index >= 0) {
    writeList(
      key,
      existing.filter((row) => row.pinKey !== item.pinKey)
    );
    return false;
  }
  writeList(key, [item, ...existing].slice(0, MAX_PINS));
  return true;
}

export function isPinned(organisationId: string, pinKey: string): boolean {
  return getPinnedItems(organisationId).some((row) => row.pinKey === pinKey);
}

export function buildPinKey(
  kind: StoredCommandItem["kind"],
  entityId: string,
  projectId?: string
): string {
  return projectId ? `${kind}:${projectId}:${entityId}` : `${kind}:${entityId}`;
}

export function storedItemFromEntry(
  entry: {
    kind: StoredCommandItem["kind"];
    label: string;
    subtitle?: string;
    href?: string;
    projectId?: string;
    entityId?: string;
    id: string;
  }
): StoredCommandItem {
  const entityId = entry.entityId ?? entry.id;
  return {
    pinKey: buildPinKey(entry.kind, entityId, entry.projectId),
    kind: entry.kind,
    label: entry.label,
    subtitle: entry.subtitle,
    href: entry.href,
    projectId: entry.projectId,
    entityId,
  };
}
