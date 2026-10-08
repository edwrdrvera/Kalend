import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

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
     * - api/auth (Better Auth's own sign-in, sign-out, and session endpoints)
     * - api/dev/sign-in (dev-only demo sign-in; 404 unless enabled, see its route)
     * - Static asset files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ping|api/waitlist|api/auth|api/dev/sign-in|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
