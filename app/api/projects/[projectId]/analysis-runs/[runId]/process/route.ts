import { NextResponse } from "next/server";

import { processDocumentAnalysisRun } from "@/src/lib/analysis-runs/process-run";
import type { AnalysisRunInputPayload } from "@/src/lib/analysis-runs/types";
import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { ANALYSIS_RUN_COLUMNS } from "@/src/lib/analysis-runs/constants";
import { createClient } from "@/src/lib/supabase/server";

/** Background processor fallback when server action after() is unavailable. */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> }
) {
  const { projectId, runId } = await context.params;

  try {
    const { profile } = await requireOrganisationProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("analysis_runs")
      .select(ANALYSIS_RUN_COLUMNS)
      .eq("id", runId)
      .eq("project_id", projectId)
      .eq("organisation_id", profile.organisation_id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    const status = String((data as { status: string }).status);
    if (status === "completed" || status === "failed") {
      return NextResponse.json({ ok: true, alreadyFinished: true });
    }

    let payload: AnalysisRunInputPayload;
    try {
      payload = (await request.json()) as AnalysisRunInputPayload;
    } catch {
      return NextResponse.json(
        { error: "Analysis input payload required in request body." },
        { status: 400 }
      );
    }

    if (!payload.documentId) {
      return NextResponse.json(
        { error: "documentId is required in payload." },
        { status: 400 }
      );
    }

    void processDocumentAnalysisRun(runId, payload);

    return NextResponse.json({ ok: true, started: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
}
