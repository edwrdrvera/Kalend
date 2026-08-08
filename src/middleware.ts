import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
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
     * - api/test (scratch mock endpoint)
     * - Static asset files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ping|api/test|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
