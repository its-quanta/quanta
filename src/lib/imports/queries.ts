import { createClient } from "@/src/lib/supabase/server";
import type { ImportBatch, ImportType } from "@/src/lib/imports/types";

export type ImportBatchWithUser = ImportBatch & {
  imported_by_email: string | null;
};

export async function getImportBatchesForOrganisation(
  organisationId: string,
  limit = 50
): Promise<ImportBatchWithUser[]> {
  if (!organisationId) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("import_batches")
    .select(
      "id, organisation_id, import_type, rows_imported, rows_failed, duplicate_strategy, imported_by, created_at"
    )
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (/relation .+ does not exist/i.test(error.message)) {
      return [];
    }
    console.error("[import_batches] getImportBatchesForOrganisation:", error.message);
    return [];
  }

  const batches = (data ?? []).map((row) => ({
    id: String(row.id),
    organisation_id: String(row.organisation_id),
    import_type: row.import_type as ImportType,
    rows_imported: Number(row.rows_imported),
    rows_failed: Number(row.rows_failed),
    duplicate_strategy: row.duplicate_strategy as ImportBatch["duplicate_strategy"],
    imported_by: row.imported_by != null ? String(row.imported_by) : null,
    created_at: String(row.created_at),
  }));

  const userIds = [
    ...new Set(batches.map((batch) => batch.imported_by).filter(Boolean)),
  ] as string[];

  if (userIds.length === 0) {
    return batches.map((batch) => ({ ...batch, imported_by_email: null }));
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const emailById = new Map(
    (profiles ?? []).map((profile) => [String(profile.id), String(profile.email)])
  );

  return batches.map((batch) => ({
    ...batch,
    imported_by_email: batch.imported_by
      ? (emailById.get(batch.imported_by) ?? null)
      : null,
  }));
}
