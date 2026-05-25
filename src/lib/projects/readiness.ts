import type {
  Document,
  PricingItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type ProjectReadinessCounts = {
  documentsUploaded: number;
  takeoffItems: number;
  pricedItems: number;
  packageAppliedItems: number;
  unpricedItems: number;
};

export function computeProjectReadiness(
  documents: Document[],
  takeoffItems: TakeoffItem[],
  pricingItems: PricingItem[],
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[]
): ProjectReadinessCounts {
  const priceableTakeoff = takeoffItems.filter(
    (item) => item.status !== "excluded"
  );
  const pricedTakeoffIds = new Set(
    pricingItems.map((item) => item.takeoff_item_id)
  );
  const pricedItems = priceableTakeoff.filter((item) =>
    pricedTakeoffIds.has(item.id)
  ).length;
  const unpricedItems = priceableTakeoff.length - pricedItems;

  return {
    documentsUploaded: documents.length,
    takeoffItems: takeoffItems.length,
    pricedItems,
    packageAppliedItems: takeoffAssemblies.length,
    unpricedItems: Math.max(0, unpricedItems),
  };
}
