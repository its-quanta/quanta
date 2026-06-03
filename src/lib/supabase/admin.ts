import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for secure server-only admin paths.
 * Not required for standard onboarding — use only when RLS/RPC is insufficient.
 */
export function createAdminClient() {
  const client = tryCreateAdminClient();
  if (!client) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API → service_role)."
    );
  }
  return client;
}

/** Returns null when service role credentials are not configured. */
export function tryCreateAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
