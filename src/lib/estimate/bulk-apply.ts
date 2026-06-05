import type { AssemblyPackage, TakeoffItem } from "@/src/types/database";

export type TradeGroup = {
  trade: string;
  items: TakeoffItem[];
};

export function normaliseTrade(value: string | null | undefined): string {
  return (value ?? "").trim() || "General";
}

export function groupItemsByTrade(items: TakeoffItem[]): TradeGroup[] {
  const groups = new Map<string, TakeoffItem[]>();

  for (const item of items) {
    const trade = normaliseTrade(item.trade);
    const list = groups.get(trade) ?? [];
    list.push(item);
    groups.set(trade, list);
  }

  return [...groups.entries()]
    .map(([trade, groupItems]) => ({ trade, items: groupItems }))
    .sort((a, b) => b.items.length - a.items.length);
}

export function packagesForTrade(
  assemblyPackages: AssemblyPackage[],
  trade: string
): AssemblyPackage[] {
  const normalised = normaliseTrade(trade).toLowerCase();

  return assemblyPackages
    .filter((pkg) => pkg.is_active)
    .filter((pkg) => normaliseTrade(pkg.trade).toLowerCase() === normalised)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatSelectedItemPreview(items: TakeoffItem[], limit = 5): string {
  if (items.length === 0) {
    return "";
  }

  const names = items.slice(0, limit).map((item) => item.item_name);
  const remainder = items.length - names.length;

  if (remainder <= 0) {
    return names.join(", ");
  }

  return `${names.join(", ")} and ${remainder} more`;
}

export function bulkApplyGroupKey(trade: string, packageId: string): string {
  return `${trade}:${packageId}`;
}
