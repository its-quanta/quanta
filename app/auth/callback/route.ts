import { NextResponse } from "next/server";

import { ensureAuthProfile } from "@/src/lib/auth/ensure-profile";
import { resolvePostAuthRedirect } from "@/src/lib/auth/redirect";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    await ensureAuthProfile(data.user);
  } catch {
    return NextResponse.redirect(`${origin}/login`);
  }

  const destination = await resolvePostAuthRedirect(data.user.id);
  return NextResponse.redirect(`${origin}${destination}`);
}
