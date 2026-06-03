import {
  AI_REVIEW_APPROVAL_EVENT_COLUMNS,
  mapAiReviewApprovalEventRow,
  type AiReviewApprovalEvent,
} from "@/src/lib/ai-review/approval-history";
import {
  AI_REVIEW_COLUMN_SELECT_ATTEMPTS,
  AI_REVIEW_STATUSES,
} from "@/src/lib/ai-review/constants";
import { isMissingColumnError } from "@/src/lib/ai-review/db-helpers";
import { mapAiReviewItemRow } from "@/src/lib/ai-review/schema";
import {
  AI_REVIEW_SEGMENT_COLUMNS,
  mapAiReviewSegmentRow,
  type AiReviewSegment,
} from "@/src/lib/ai-review/segments";
import { createClient } from "@/src/lib/supabase/server";
import type { AiReviewItem } from "@/src/types/database";

export type AiReviewItemsFetchResult = {
  items: AiReviewItem[];
  source: "direct_select" | "list_rpc" | "none";
  error: string | null;
};

function isPermissionError(message: string): boolean {
  return /permission denied|row-level security|not authorized|42501/i.test(
    message
  );
}

function logAiReviewFetch(input: {
  projectId: string;
  organisationId: string;
  rowCount: number;
  statuses: string[];
  source: AiReviewItemsFetchResult["source"];
  selectColumns?: string;
  error?: string;
}) {
  console.info("[ai_review_items] fetched", {
    projectId: input.projectId,
    organisationId: input.organisationId,
    rowCount: input.rowCount,
    statuses: input.statuses,
    source: input.source,
    ...(input.selectColumns ? { selectColumns: input.selectColumns } : {}),
    ...(input.error ? { error: input.error } : {}),
  });
}

function mapRows(rows: unknown[]): AiReviewItem[] {
  return rows.map((row) => mapAiReviewItemRow(row as Record<string, unknown>));
}

function filterReviewItems(items: AiReviewItem[]): AiReviewItem[] {
  return items.filter((item) => AI_REVIEW_STATUSES.includes(item.status));
}

async function fetchAiReviewItemsViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<AiReviewItem[] | { error: string }> {
  const { data, error } = await supabase.rpc("list_ai_review_items_for_project", {
    p_project_id: projectId,
  });

  if (error) {
    if (/could not find the function|function .* does not exist/i.test(error.message)) {
      return { error: "list_rpc_unavailable" };
    }
    return { error: error.message };
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return filterReviewItems(mapRows(data));
}

export async function getAiReviewItemsForProject(
  projectId: string,
  organisationId: string
): Promise<AiReviewItemsFetchResult> {
  if (!organisationId) {
    console.warn("[ai_review_items] fetch_skipped", {
      projectId,
      organisationId,
      reason: "missing_organisation_id",
    });
    return { items: [], source: "none", error: "missing_organisation_id" };
  }

  const supabase = await createClient();
  let lastError: string | null = null;
  let shouldTryRpc = false;

  for (const selectColumns of AI_REVIEW_COLUMN_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("ai_review_items")
      .select(selectColumns)
      .eq("project_id", projectId)
      .eq("organisation_id", organisationId)
      .in("status", AI_REVIEW_STATUSES)
      .order("created_at", { ascending: false });

    if (!error) {
      const items = filterReviewItems(mapRows((data ?? []) as unknown[]));
      const statuses = [...new Set(items.map((item) => item.status))];

      logAiReviewFetch({
        projectId,
        organisationId,
        rowCount: items.length,
        statuses,
        source: "direct_select",
        selectColumns,
      });

      return { items, source: "direct_select", error: null };
    }

    lastError = error.message;

    if (/relation .+ does not exist/i.test(error.message)) {
      console.warn("[ai_review_items] table_missing", {
        projectId,
        organisationId,
        message: error.message,
      });
      return { items: [], source: "none", error: error.message };
    }

    if (isMissingColumnError(error.message)) {
      continue;
    }

    if (isPermissionError(error.message)) {
      shouldTryRpc = true;
      break;
    }

    console.error("[ai_review_items] getAiReviewItemsForProject", {
      projectId,
      organisationId,
      message: error.message,
      selectColumns,
    });
    shouldTryRpc = true;
    break;
  }

  if (shouldTryRpc || lastError) {
    const rpcResult = await fetchAiReviewItemsViaRpc(supabase, projectId);

    if (Array.isArray(rpcResult)) {
      const items = filterReviewItems(rpcResult);
      const statuses = [...new Set(items.map((item) => item.status))];
      logAiReviewFetch({
        projectId,
        organisationId,
        rowCount: items.length,
        statuses,
        source: "list_rpc",
      });
      return { items, source: "list_rpc", error: null };
    }

    if (rpcResult.error !== "list_rpc_unavailable") {
      console.error("[ai_review_items] list_rpc_failed", {
        projectId,
        organisationId,
        message: rpcResult.error,
      });
      return { items: [], source: "none", error: rpcResult.error };
    }
  }

  console.error("[ai_review_items] getAiReviewItemsForProject", {
    projectId,
    organisationId,
    message: lastError,
  });

  return {
    items: [],
    source: "none",
    error: lastError ?? "fetch_failed",
  };
}

export async function countAiReviewItemsForProjectSince(
  projectId: string,
  organisationId: string,
  sinceIso: string
): Promise<number> {
  if (!organisationId) {
    return 0;
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ai_review_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .in("status", AI_REVIEW_STATUSES)
    .gte("created_at", sinceIso);

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return 0;
    }

    const fetchResult = await getAiReviewItemsForProject(projectId, organisationId);
    return fetchResult.items.filter((item) => item.created_at >= sinceIso).length;
  }

  return count ?? 0;
}

export async function getAiReviewSegmentsForItem(
  itemId: string,
  projectId: string,
  organisationId: string
): Promise<AiReviewSegment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_review_segments")
    .select(AI_REVIEW_SEGMENT_COLUMNS)
    .eq("ai_review_item_id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("segment_key", { ascending: true });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[ai_review_segments] getAiReviewSegmentsForItem:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapAiReviewSegmentRow(row as Record<string, unknown>)
  );
}

export async function getAiReviewApprovalHistory(
  itemId: string,
  projectId: string,
  organisationId: string
): Promise<AiReviewApprovalEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_review_approval_events")
    .select(AI_REVIEW_APPROVAL_EVENT_COLUMNS)
    .eq("ai_review_item_id", itemId)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[ai_review_approval_events] getAiReviewApprovalHistory:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapAiReviewApprovalEventRow(row as Record<string, unknown>)
  );
}
