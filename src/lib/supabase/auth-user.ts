import { headers } from "next/headers";
import { createClient } from "./server";
import { AUTH_USER_ID_HEADER } from "./middleware";

/**
 * Minimal shape returned to route handlers. Every handler only ever uses
 * `.id` to scope queries by owner (see `src/app/api/CLAUDE.md`), so the
 * helper deliberately doesn't return the full Supabase `User` — that would
 * imply extra fields are available when they aren't.
 */
export interface AuthenticatedUser {
  id: string;
}

/**
 * Retrieves the currently authenticated Supabase user on the server.
 * Returns null if the user is unauthenticated.
 *
 * Fast path: `src/proxy.ts` calls `supabase.auth.getUser()` on every
 * protected route and forwards the validated user id to the destination
 * handler as the `AUTH_USER_ID_HEADER` request header. When that header is
 * present we trust it (it was set by our own middleware, not by the client;
 * the middleware strips any inbound copy) and skip the round trip.
 *
 * Fallback: if the header is missing (a route the matcher doesn't cover, a
 * test harness that stubs the middleware away, an unexpected direct hit),
 * fall back to `supabase.auth.getUser()` so nothing is silently trusted.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headerStore = await headers();
    const forwardedId = headerStore.get(AUTH_USER_ID_HEADER);
    if (forwardedId) {
      return { id: forwardedId };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { id: user.id };
  } catch (err) {
    console.error("Auth verification error:", err);
    return null;
  }
}
