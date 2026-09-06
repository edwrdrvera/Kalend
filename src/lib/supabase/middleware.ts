import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase credentials are missing (e.g. initial setup), pass request through
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  const pathname = request.nextUrl.pathname;
  // Routes an authenticated visitor should be bounced off of, back to the
  // app. Also the full set of public routes: with no signup, forgot-password,
  // or reset-password flows left, "/" and "/login" are the only ones.
  const isAuthOnlyRoute = pathname === "/" || pathname === "/login";

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
