import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ping (health check endpoint)
     * - api/waitlist (public landing-page signup, no auth)
     * - api/dev/sign-in (dev-only demo sign-in; 404 unless enabled, see its route)
     * - Static asset files (.svg, .png, .jpg, .jpeg, .gif, .webp) outside /api.
     *   An API path must always run the proxy: it is what strips a forged
     *   x-kalend-user-id header before a route handler trusts it.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ping|api/waitlist|api/dev/sign-in|(?!api/).*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
