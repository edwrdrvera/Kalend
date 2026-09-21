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
     * - Static asset files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ping|api/waitlist|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
