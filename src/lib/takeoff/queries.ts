import { createClient } from "@/src/lib/supabase/server";
import {
  queryTakeoffItemById,
  queryTakeoffItemsForProject,
} from "@/src/lib/takeoff/takeoff-schema";
import type { TakeoffItem } from "@/src/types/database";

export async function getTakeoffItemsForProject(
  projectId: string,
  organisationId: string
): Promise<TakeoffItem[]> {
  const supabase = await createClient();
  return queryTakeoffItemsForProject(supabase, projectId, organisationId);
}

export async function getTakeoffItemById(
  itemId: string,
  organisationId: string
): Promise<TakeoffItem | null> {
  const supabase = await createClient();
  return queryTakeoffItemById(supabase, itemId, organisationId);
}
