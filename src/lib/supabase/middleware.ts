import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfig,
  SupabaseConfigurationError,
} from "./config";

/**
 * Name of the request header the middleware writes the validated Supabase
 * user id into for downstream route handlers. Route handlers read it via
 * `getAuthenticatedUser()` instead of re-validating the JWT with a second
 * network round trip to Supabase Auth.
 *
 * Kept in sync with the reader in `src/lib/supabase/auth-user.ts`. Callers
 * outside this middleware must never trust an inbound copy of this header;
 * we strip it from the incoming request below before setting our own.
 */
export const AUTH_USER_ID_HEADER = "x-kalend-user-id";

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
 *
 * On success the validated user id is forwarded to the destination as the
 * `AUTH_USER_ID_HEADER` request header so route handlers can identify the
 * caller without a second `getUser()` round trip.
 */
export async function updateSession(request: NextRequest) {
  // Strip any inbound copy of our internal auth header so a client can't
  // forge one; only this middleware may set it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_USER_ID_HEADER);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
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
          request: { headers: requestHeaders },
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

  // Forward the validated user id to the destination route handler. Rebuild
  // the response so the fresh header set is what Next.js hands the handler,
  // and copy any auth-cookie mutations from the interim response back onto it.
  if (user) {
    requestHeaders.set(AUTH_USER_ID_HEADER, user.id);
    const forwarded = NextResponse.next({
      request: { headers: requestHeaders },
    });
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      forwarded.cookies.set(cookie);
    });
    return forwarded;
  }

  return supabaseResponse;
}
