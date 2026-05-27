export type BulkOperationResult = {
  error?: string;
  updatedCount?: number;
  failedCount?: number;
  warnings?: string[];
  message?: string;
};

export type BulkApplyPackageInput = {
  takeoffItemIds: string[];
  assemblyPackageId: string;
  replaceExistingPricing?: boolean;
};

export type BulkApplyPackageItemResult = {
  takeoffItemId: string;
  itemName: string;
  status: "updated" | "skipped" | "failed";
  reason?: string;
};

export type BulkApplyPackageResult = BulkOperationResult & {
  items?: BulkApplyPackageItemResult[];
};
