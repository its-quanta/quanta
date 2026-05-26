import { logClarificationError } from "@/src/lib/clarifications/errors";
import {
  CLARIFICATION_COLUMNS,
  mapClarificationTemplateRow,
  mapTenderClarificationRow,
  TEMPLATE_COLUMNS,
} from "@/src/lib/clarifications/schema";
import { createClient } from "@/src/lib/supabase/server";
import type {
  ClarificationTemplate,
  ClarificationType,
  TenderClarification,
} from "@/src/types/database";

export async function getClarificationsForProject(
  projectId: string,
  organisationId: string
): Promise<TenderClarification[]> {
  if (!organisationId) {
    console.error(
      "[tender_clarifications] getClarificationsForProject: missing organisationId"
    );
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tender_clarifications")
    .select(CLARIFICATION_COLUMNS)
    .eq("project_id", projectId)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    logClarificationError("getClarificationsForProject", error);
    return [];
  }

  return (data ?? []).map((row) =>
    mapTenderClarificationRow(row as Record<string, unknown>)
  );
}

export async function getClarificationsByType(
  projectId: string,
  organisationId: string,
  type: ClarificationType
): Promise<TenderClarification[]> {
  const items = await getClarificationsForProject(projectId, organisationId);
  return items.filter((item) => item.type === type);
}

export async function getClarificationTemplatesForOrganisation(
  organisationId: string
): Promise<ClarificationTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clarification_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("is_active", true)
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("getClarificationTemplatesForOrganisation:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapClarificationTemplateRow(row as Record<string, unknown>)
  );
}
