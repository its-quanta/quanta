import { AI_REVIEW_COLUMNS } from "@/src/lib/ai-review/constants";
import { mapAiReviewItemRow } from "@/src/lib/ai-review/schema";
import { createClient } from "@/src/lib/supabase/server";
import type { AiReviewItem } from "@/src/types/database";

export async function getAiReviewItemsForProject(
  projectId: string,
  organisationId: string
): Promise<AiReviewItem[]> {
  if (!organisationId) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_review_items")
    .select(AI_REVIEW_COLUMNS)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[ai_review_items] getAiReviewItemsForProject:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapAiReviewItemRow(row as Record<string, unknown>)
  );
}
