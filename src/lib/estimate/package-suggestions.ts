import type { AssemblyPackage, TakeoffItem } from "@/src/types/database";

function normaliseTrade(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function getTradeMatchedPackages(
  item: TakeoffItem,
  assemblyPackages: AssemblyPackage[]
): AssemblyPackage[] {
  const itemTrade = normaliseTrade(item.trade);
  if (!itemTrade) {
    return [];
  }

  return assemblyPackages.filter(
    (pkg) => pkg.is_active && normaliseTrade(pkg.trade) === itemTrade
  );
}

export function getSingleTradePackageMatch(
  item: TakeoffItem,
  assemblyPackages: AssemblyPackage[]
): AssemblyPackage | null {
  const matches = getTradeMatchedPackages(item, assemblyPackages);
  return matches.length === 1 ? matches[0] : null;
}

export function hasMultipleTradePackageMatches(
  item: TakeoffItem,
  assemblyPackages: AssemblyPackage[]
): boolean {
  return getTradeMatchedPackages(item, assemblyPackages).length > 1;
}
