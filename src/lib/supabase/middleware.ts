import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfig,
  SupabaseConfigurationError,
} from "./config";

/**
 * Refreshes the user's Supabase session and enforces route protection rules.
 *
 * Rules:
 * - `/` is the public landing page. Anyone, logged in or not, can load it directly.
 * - `/login` is public too: there's no signup in this MVP, just a single demo
 *   account (see src/db/CLAUDE.md) anyone can sign in with.
 * - Unauthenticated users attempting to access any other protected route (notably `/app`,
 *   the calendar) are redirected to `/login`.
 * - Authenticated users attempting to access `/` or `/login` are redirected to
 *   `/app`, so a signed-in visitor lands on the calendar instead of the marketing page.
 * - If auth is not configured, public pages remain available, protected pages
 *   redirect to login with a friendly error, and protected APIs return 503.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isAuthOnlyRoute = pathname === "/" || pathname === "/login";
  let supabaseConfig;

  try {
    supabaseConfig = getSupabaseConfig();
  } catch (error) {
    if (!(error instanceof SupabaseConfigurationError)) {
      throw error;
    }

    if (isAuthOnlyRoute) {
      return supabaseResponse;
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "configuration");
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Use getUser() instead of getSession() to securely validate the JWT against Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes an authenticated visitor should be bounced off of, back to the
  // app. Also the full set of public routes: with no signup, forgot-password,
  // or reset-password flows left, "/" and "/login" are the only ones.
  // Redirect unauthenticated users away from protected pages (e.g. /app) to /login
  if (!user && !isAuthOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from the landing page and the login
  // form to the calendar app
  if (user && isAuthOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
