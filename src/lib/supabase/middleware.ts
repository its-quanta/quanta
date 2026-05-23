import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { queryProfileOrganisationId } from "@/src/lib/auth/profile-schema";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/templates",
  "/rates",
  "/settings",
];

const AUTH_PAGES = ["/login", "/signup"];
const ONBOARDING_PATH = "/onboarding";

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isProtectedPath(pathname) || pathname === ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const organisationId = await queryProfileOrganisationId(supabase, user.id);
  const needsOnboarding = !organisationId;

  if (AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = needsOnboarding ? ONBOARDING_PATH : "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === ONBOARDING_PATH && !needsOnboarding) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (needsOnboarding && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ONBOARDING_PATH;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
