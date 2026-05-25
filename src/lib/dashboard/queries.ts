import { createClient } from "@/src/lib/supabase/server";
import { isMissingColumnError } from "@/src/lib/auth/profile-schema";

export type TakeoffSummaryRow = {
  project_id: string;
  status: string | null;
  reviewed: boolean | null;
};

const TAKEOFF_SUMMARY_SELECTS = [
  "project_id, status, reviewed",
  "project_id, status",
  "project_id",
] as const;

export async function getTakeoffSummaryForOrganisation(
  organisationId: string
): Promise<TakeoffSummaryRow[]> {
  const supabase = await createClient();
  let lastError: string | null = null;

  for (const select of TAKEOFF_SUMMARY_SELECTS) {
    const { data, error } = await supabase
      .from("takeoff_items")
      .select(select)
      .eq("organisation_id", organisationId);

    if (!error) {
      return (data ?? []) as unknown as TakeoffSummaryRow[];
    }

    lastError = error.message;

    if (!isMissingColumnError(error.message)) {
      break;
    }
  }

  if (lastError) {
    console.error("takeoff summary query failed:", lastError);
  }

  return [];
}
