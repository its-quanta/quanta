"use server";

import { after } from "next/server";

import {
  ANALYSIS_RUN_COLUMNS,
  ANALYSIS_RUN_STAGE,
} from "@/src/lib/analysis-runs/constants";
import { errorReferenceFromMessage } from "@/src/lib/analysis-runs/error-reference";
import { processDocumentAnalysisRun } from "@/src/lib/analysis-runs/process-run";
import type {
  AnalysisRunInputPayload,
  AnalysisRunRow,
  AnalysisRunStatusSnapshot,
} from "@/src/lib/analysis-runs/types";
import { validateAnalysisRunInput } from "@/src/lib/analysis-runs/validate-input";
import type { AnalyseProjectDocumentsInput } from "@/src/lib/ai-review/document-analysis/actions";
import { buildSuccessResult } from "@/src/lib/ai-review/document-analysis/analysis-summary";
import { countLowConfidenceSuggestions } from "@/src/lib/ai-review/document-analysis/analysis-summary";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import {
  countAiReviewItemsForProjectSince,
  getAiReviewItemsForProject,
} from "@/src/lib/ai-review/queries";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getDocumentPagesForProject } from "@/src/lib/documents/document-page-queries";
import { createClient } from "@/src/lib/supabase/server";

async function buildCompletedRunResult(
  row: AnalysisRunRow
): Promise<import("@/src/lib/ai-review/document-analysis/types").AnalyseDocumentsResult> {
  const sinceIso = row.started_at ?? row.created_at;
  const [createdCount, reviewItemsResult] = await Promise.all([
    countAiReviewItemsForProjectSince(
      row.project_id,
      row.organisation_id,
      sinceIso
    ),
    getAiReviewItemsForProject(row.project_id, row.organisation_id),
  ]);

  const items = reviewItemsResult.items;

  const runItems = items.filter((item) => item.created_at >= sinceIso);
  const resolvedCreatedCount =
    createdCount > 0 ? createdCount : runItems.length;
  const lowConfidenceCount = countLowConfidenceSuggestions(runItems);

  let summaryMessage: string | undefined;
  if (row.error_message === ANALYSIS_ERRORS.emptySuggestions) {
    summaryMessage = row.error_message;
  } else if (resolvedCreatedCount > 0) {
    summaryMessage = `${resolvedCreatedCount} suggestion${
      resolvedCreatedCount === 1 ? "" : "s"
    } created`;
  }

  return buildSuccessResult({
    createdCount: resolvedCreatedCount,
    analysedDocuments:
      row.documents_completed > 0
        ? [
            {
              id: row.project_id,
              fileName:
                row.documents_completed === 1
                  ? "1 document analysed"
                  : `${row.documents_completed} documents analysed`,
            },
          ]
        : [],
    pagesAnalysed: row.pages_completed,
    lowConfidenceCount,
    selectedPageCount: row.pages_total,
    summaryMessage,
  });
}

async function toStatusSnapshot(
  row: AnalysisRunRow
): Promise<AnalysisRunStatusSnapshot> {
  const result =
    row.status === "completed" ? await buildCompletedRunResult(row) : null;

  return {
    runId: row.id,
    status: row.status,
    progress: row.progress,
    currentStage: row.current_stage,
    stageLabel: row.current_stage,
    documentsTotal: row.documents_total,
    documentsCompleted: row.documents_completed,
    pagesTotal: row.pages_total,
    pagesCompleted: row.pages_completed,
    errorMessage: row.error_message,
    errorReference: row.error_reference,
    result,
  };
}

export async function startDocumentAnalysisRunAction(
  projectId: string,
  input: AnalyseProjectDocumentsInput
): Promise<
  | { runId: string }
  | { error: string; batchStatus?: "failed" | "requires_page_selection" }
> {
  const { profile } = await requireOrganisationProfile();

  const documentPages = await getDocumentPagesForProject(
    projectId,
    profile.organisation_id
  );

  const validated = await validateAnalysisRunInput(
    projectId,
    profile.organisation_id,
    input,
    documentPages
  );

  if (!validated.ok) {
    return {
      error: validated.error,
      batchStatus: validated.batchStatus,
    };
  }

  const selectedPages = input.selectedPages ?? input.selected_pages ?? [];

  const payload: AnalysisRunInputPayload = {
    ...input,
    selectedPages,
    resolvedSelectedPages: validated.data.selectedPages,
  };

  const supabase = await createClient();

  const { data: inserted, error: insertError } = await supabase
    .from("analysis_runs")
    .insert({
      organisation_id: profile.organisation_id,
      project_id: projectId,
      status: "queued",
      progress: 0,
      current_stage: ANALYSIS_RUN_STAGE.preparing,
      documents_total: 1,
      documents_completed: 0,
      pages_total: validated.data.selectedPages.length,
      pages_completed: 0,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[analysis-run] insert_failed", insertError?.message);
    return {
      error: insertError?.message ?? ANALYSIS_ERRORS.analysisFailed,
      batchStatus: "failed",
    };
  }

  const runId = String((inserted as { id: string }).id);

  after(async () => {
    try {
      await processDocumentAnalysisRun(runId, payload);
    } catch (error) {
      console.error("[analysis-run] process_failed", runId, error);
      const client = await createClient();
      await client
        .from("analysis_runs")
        .update({
          status: "failed",
          error_message: ANALYSIS_ERRORS.analysisFailed,
          error_reference: errorReferenceFromMessage(ANALYSIS_ERRORS.analysisFailed),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  });

  return { runId };
}

export async function getAnalysisRunStatusAction(
  projectId: string,
  runId: string
): Promise<
  | { snapshot: AnalysisRunStatusSnapshot }
  | { error: string }
> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analysis_runs")
    .select(ANALYSIS_RUN_COLUMNS)
    .eq("id", runId)
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Analysis run not found." };
  }

  return { snapshot: await toStatusSnapshot(data as unknown as AnalysisRunRow) };
}

export async function getActiveAnalysisRunForProjectAction(
  projectId: string
): Promise<{ snapshot: AnalysisRunStatusSnapshot | null }> {
  const { profile } = await requireOrganisationProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analysis_runs")
    .select(ANALYSIS_RUN_COLUMNS)
    .eq("project_id", projectId)
    .eq("organisation_id", profile.organisation_id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[analysis-run] active_lookup_failed", error.message);
    return { snapshot: null };
  }

  if (!data) {
    return { snapshot: null };
  }

  return { snapshot: await toStatusSnapshot(data as unknown as AnalysisRunRow) };
}
