import { NextResponse, type NextRequest } from "next/server";
import { auth } from "./server";

/**
 * The request header this proxy writes the validated user id into for
 * downstream route handlers, so `getAuthenticatedUser()` can skip a second
 * session lookup. Only this proxy may set it: any inbound copy is stripped
 * before the session check.
 */
export const AUTH_USER_ID_HEADER = "x-kalend-user-id";

/**
 * Validates the session cookie against the session table and enforces the
 * route rules:
 * - `/` (landing) and `/login` are public. A signed-in visitor on either is
 *   redirected to `/app`.
 * - Every other matched route needs a session. A visitor without one is
 *   redirected to `/login`.
 *
 * A new public route belongs in `isPublicRoute` below, not only in the
 * matcher in `src/proxy.ts`.
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_USER_ID_HEADER);

  const { headers: authHeaders, response: session } = await auth.api.getSession({
    headers: requestHeaders,
    returnHeaders: true,
  });

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === "/" || pathname === "/login";

  let response: NextResponse;
  if (!session && !isPublicRoute) {
    response = redirectTo(request, "/login");
  } else if (session && isPublicRoute) {
    response = redirectTo(request, "/app");
  } else {
    if (session) requestHeaders.set(AUTH_USER_ID_HEADER, session.user.id);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // A session lookup can refresh the session's expiry or clear a stale
  // cookie; carry those cookie writes to the browser.
  for (const cookie of authHeaders.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}
