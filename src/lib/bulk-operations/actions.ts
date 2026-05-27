"use server";

import { revalidatePath } from "next/cache";

import type {
  BulkApplyPackageInput,
  BulkApplyPackageResult,
  BulkOperationResult,
} from "@/src/lib/bulk-operations/types";
import { unitsAreCompatible } from "@/src/lib/bulk-operations/units";
import { getAssemblyPackageById } from "@/src/lib/assemblies/queries";
import {
  deleteClarificationAction,
  updateClarificationAction,
} from "@/src/lib/clarifications/actions";
import {
  deleteProjectLabourItemsAction,
  deleteProjectMaterialItemsAction,
  reviewProjectLabourItemsAction,
  reviewProjectMaterialItemsAction,
  updateProjectLabourItemsAction,
  updateProjectMaterialItemsAction,
} from "@/src/lib/estimate-generation/actions";
import {
  deletePricingItemAction,
  updatePricingItemAction,
} from "@/src/lib/pricing/actions";
import { applyAssemblyPackageToTakeoffAction } from "@/src/lib/takeoff-assembly/actions";
import {
  deleteTakeoffItemAction,
  markTakeoffItemReviewedAction,
  updateTakeoffItemAction,
} from "@/src/lib/takeoff/actions";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { createClient } from "@/src/lib/supabase/server";
import type { RfiPriority, TenderClarification } from "@/src/types/database";

async function assertProjectAccess(projectId: string) {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (error || !project) {
    return { error: "Project not found." as const };
  }

  return { profile, organisationId: profile.organisation_id };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

export async function bulkDeleteTakeoffItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<BulkOperationResult> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;
  const warnings: string[] = [];

  for (const itemId of itemIds) {
    const result = await deleteTakeoffItemAction(itemId, projectId);
    if (result.error) {
      failedCount += 1;
      warnings.push(result.error);
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    warnings: warnings.length > 0 ? warnings : undefined,
    message: `${updatedCount} item${updatedCount === 1 ? "" : "s"} deleted`,
  };
}

export async function bulkMarkTakeoffReviewedAction(
  projectId: string,
  itemIds: string[],
  reviewed = true
): Promise<BulkOperationResult> {
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const itemId of itemIds) {
    const result = reviewed
      ? await markTakeoffItemReviewedAction(itemId, projectId)
      : await updateTakeoffItemAction(itemId, projectId, { reviewed: false });

    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} item${updatedCount === 1 ? "" : "s"} marked ${reviewed ? "reviewed" : "unreviewed"}`,
  };
}

export async function bulkUpdateTakeoffTradeAction(
  projectId: string,
  itemIds: string[],
  trade: string
): Promise<BulkOperationResult> {
  const trimmed = trade.trim();
  if (!trimmed) {
    return { error: "Enter a trade." };
  }
  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const itemId of itemIds) {
    const result = await updateTakeoffItemAction(itemId, projectId, {
      trade: trimmed,
    });
    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} item${updatedCount === 1 ? "" : "s"} updated`,
  };
}

export async function bulkApplyPackageToTakeoffAction(
  projectId: string,
  input: BulkApplyPackageInput
): Promise<BulkApplyPackageResult> {
  if (!input.assemblyPackageId) {
    return { error: "Select a methodology package." };
  }
  if (input.takeoffItemIds.length === 0) {
    return { error: "No takeoff lines selected." };
  }

  const access = await assertProjectAccess(projectId);
  if ("error" in access) {
    return { error: access.error };
  }

  const assemblyPackage = await getAssemblyPackageById(
    input.assemblyPackageId,
    access.organisationId
  );

  if (!assemblyPackage) {
    return { error: "Assembly package not found." };
  }

  const supabase = await createClient();
  const { data: takeoffRows, error: takeoffError } = await supabase
    .from("takeoff_items")
    .select("id, item_name, quantity, unit, status")
    .eq("project_id", projectId)
    .eq("organisation_id", access.organisationId)
    .in("id", input.takeoffItemIds);

  if (takeoffError) {
    return { error: takeoffError.message };
  }

  const takeoffById = new Map(
    (takeoffRows ?? []).map((row) => [row.id as string, row] as const)
  );

  const items: BulkApplyPackageResult["items"] = [];
  let updatedCount = 0;
  let failedCount = 0;
  const warnings: string[] = [];

  for (const takeoffItemId of input.takeoffItemIds) {
    const takeoff = takeoffById.get(takeoffItemId);
    if (!takeoff) {
      failedCount += 1;
      items.push({
        takeoffItemId,
        itemName: "Unknown",
        status: "failed",
        reason: "Takeoff line not found.",
      });
      continue;
    }

    const itemName = String(takeoff.item_name);
    if (takeoff.status === "excluded") {
      failedCount += 1;
      items.push({
        takeoffItemId,
        itemName,
        status: "skipped",
        reason: "Excluded from takeoff.",
      });
      continue;
    }

    if (
      !unitsAreCompatible(String(takeoff.unit), assemblyPackage.unit)
    ) {
      failedCount += 1;
      const reason = `Unit mismatch: line is ${takeoff.unit}, package is ${assemblyPackage.unit}.`;
      warnings.push(`${itemName}: ${reason}`);
      items.push({
        takeoffItemId,
        itemName,
        status: "skipped",
        reason,
      });
      continue;
    }

    const result = await applyAssemblyPackageToTakeoffAction(projectId, {
      takeoff_item_id: takeoffItemId,
      assembly_package_id: input.assemblyPackageId,
      quantity: Number(takeoff.quantity),
      unit: String(takeoff.unit),
      replace_existing_pricing: input.replaceExistingPricing ?? true,
    });

    if (result.error) {
      failedCount += 1;
      items.push({
        takeoffItemId,
        itemName,
        status: "failed",
        reason: result.error,
      });
    } else if (result.needsReplace) {
      failedCount += 1;
      items.push({
        takeoffItemId,
        itemName,
        status: "skipped",
        reason: "Existing pricing must be replaced individually.",
      });
    } else {
      updatedCount += 1;
      items.push({
        takeoffItemId,
        itemName,
        status: "updated",
      });
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    warnings: warnings.length > 0 ? warnings : undefined,
    items,
    message: `${updatedCount} item${updatedCount === 1 ? "" : "s"} updated`,
  };
}

export async function bulkDeletePricingItemsAction(
  projectId: string,
  pricingItemIds: string[]
): Promise<BulkOperationResult> {
  if (pricingItemIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const id of pricingItemIds) {
    const result = await deletePricingItemAction(id, projectId);
    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} pricing line${updatedCount === 1 ? "" : "s"} removed`,
  };
}

export async function bulkUpdatePricingMarkupAction(
  projectId: string,
  pricingItemIds: string[],
  markupPercentage: number
): Promise<BulkOperationResult> {
  if (pricingItemIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const id of pricingItemIds) {
    const result = await updatePricingItemAction(id, projectId, {
      markup_percentage: markupPercentage,
      margin_percentage: null,
    });
    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} line${updatedCount === 1 ? "" : "s"} updated`,
  };
}

export async function bulkUpdatePricingMarginAction(
  projectId: string,
  pricingItemIds: string[],
  marginPercentage: number
): Promise<BulkOperationResult> {
  if (pricingItemIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const id of pricingItemIds) {
    const result = await updatePricingItemAction(id, projectId, {
      margin_percentage: marginPercentage,
      markup_percentage: null,
    });
    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} line${updatedCount === 1 ? "" : "s"} updated`,
  };
}

export async function bulkMarkPricingTakeoffReviewedAction(
  projectId: string,
  takeoffItemIds: string[]
): Promise<BulkOperationResult> {
  return bulkMarkTakeoffReviewedAction(projectId, takeoffItemIds, true);
}

export async function bulkReviewMaterialItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<BulkOperationResult> {
  return reviewProjectMaterialItemsAction(projectId, itemIds);
}

export async function bulkReviewLabourItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<BulkOperationResult> {
  return reviewProjectLabourItemsAction(projectId, itemIds);
}

export async function bulkUpdateMaterialSupplierAction(
  projectId: string,
  itemIds: string[],
  supplier: string
): Promise<BulkOperationResult> {
  return updateProjectMaterialItemsAction(projectId, itemIds, {
    supplier: supplier.trim() || null,
  });
}

export async function bulkDeleteMaterialItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<BulkOperationResult> {
  return deleteProjectMaterialItemsAction(projectId, itemIds);
}

export async function bulkDeleteLabourItemsAction(
  projectId: string,
  itemIds: string[]
): Promise<BulkOperationResult> {
  return deleteProjectLabourItemsAction(projectId, itemIds);
}

export async function bulkUpdateLabourChargeRateAction(
  projectId: string,
  itemIds: string[],
  chargeRate: number
): Promise<BulkOperationResult> {
  return updateProjectLabourItemsAction(projectId, itemIds, { charge_rate: chargeRate });
}

export async function bulkUpdateClarificationsAction(
  projectId: string,
  clarificationIds: string[],
  updates: {
    status?: TenderClarification["status"];
    priority?: RfiPriority | null;
    reviewed?: boolean;
  }
): Promise<BulkOperationResult> {
  if (clarificationIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const id of clarificationIds) {
    const result = await updateClarificationAction(projectId, id, updates);
    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} clarification${updatedCount === 1 ? "" : "s"} updated`,
  };
}

export async function bulkDeleteClarificationsAction(
  projectId: string,
  clarificationIds: string[]
): Promise<BulkOperationResult> {
  if (clarificationIds.length === 0) {
    return { error: "No items selected." };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const id of clarificationIds) {
    const result = await deleteClarificationAction(projectId, id);
    if (result.error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  revalidateProject(projectId);
  return {
    updatedCount,
    failedCount,
    message: `${updatedCount} item${updatedCount === 1 ? "" : "s"} removed`,
  };
}
