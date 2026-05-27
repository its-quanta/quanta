"use server";

import { requireOrganisationProfile } from "@/src/lib/auth/require-profile";
import { getOrganisationCommandIndex } from "@/src/lib/command/queries";
import type { CommandIndexEntry } from "@/src/lib/command/types";

export type CommandIndexResult = {
  error?: string;
  entries?: CommandIndexEntry[];
};

export async function fetchOrganisationCommandIndexAction(): Promise<CommandIndexResult> {
  const { profile } = await requireOrganisationProfile();
  try {
    const entries = await getOrganisationCommandIndex(profile.organisation_id);
    return { entries };
  } catch {
    return { error: "Could not load search index." };
  }
}
