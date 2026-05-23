import { createClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types/database";

import {
  normalizeProfile,
  queryProfileRow,
} from "@/src/lib/auth/profile-schema";

export async function getProfileForUser(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { row, error } = await queryProfileRow(supabase, userId);

  if (error) {
    console.error("getProfileForUser:", error);
    return null;
  }

  if (!row) {
    return null;
  }

  return normalizeProfile(row);
}
