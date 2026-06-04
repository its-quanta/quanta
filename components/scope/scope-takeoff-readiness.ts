import type { PricingItem, TakeoffItemAssemblyWithPackage } from "@/src/types/database";

export type ScopeTakeoffReadiness = "needs_package" | "needs_pricing" | "ready";

export function resolveScopeTakeoffReadiness(
  takeoffItemId: string,
  assemblyByTakeoffId: ReadonlyMap<string, TakeoffItemAssemblyWithPackage>,
  pricingByTakeoffId: ReadonlyMap<string, PricingItem>
): ScopeTakeoffReadiness {
  if (!assemblyByTakeoffId.has(takeoffItemId)) {
    return "needs_package";
  }
  if (!pricingByTakeoffId.has(takeoffItemId)) {
    return "needs_pricing";
  }
  return "ready";
}

export const SCOPE_TAKEOFF_READINESS_LABELS: Record<ScopeTakeoffReadiness, string> =
  {
    needs_package: "Needs package",
    needs_pricing: "Needs pricing",
    ready: "Ready",
  };
