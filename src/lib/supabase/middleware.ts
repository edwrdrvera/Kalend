import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the user's Supabase session and enforces route protection rules.
 *
 * Rules:
 * - `/` is the public landing page. Anyone, logged in or not, can load it directly.
 * - Unauthenticated users attempting to access any other protected route (notably `/app`,
 *   the calendar) are redirected to `/login`.
 * - Authenticated users attempting to access `/`, `/login`, or `/signup` are redirected to
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
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/callback");
  // Routes an authenticated visitor should be bounced off of, back to the app.
  // Excludes /reset-password: a logged-in user can still land there from a
  // password-recovery email link and needs to complete the reset.
  const isAuthOnlyRoute =
    pathname === "/" || pathname === "/login" || pathname === "/signup";

  // Redirect unauthenticated users away from protected pages (e.g. /app) to /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from the landing page and the login/signup
  // forms to the calendar app
  if (user && isAuthOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
