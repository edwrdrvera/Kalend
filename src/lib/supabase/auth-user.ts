import { createClient } from "./server";
import type { User } from "@supabase/supabase-js";

/**
 * Retrieves the currently authenticated Supabase user on the server.
 * Returns null if the user is unauthenticated or if the session cookie is
 * missing.
 *
 * Uses `getSession()` (a local cookie read) rather than `getUser()` (a
 * network round trip to Supabase Auth) because `src/middleware.ts` already
 * calls `getUser()` on every protected route in the same request, so the
 * JWT is validated once at the edge instead of again in every handler.
 * That halved the per-request auth latency for the API routes on load.
 *
 * Public routes excluded from the middleware matcher (see `src/middleware.ts`)
 * must not rely on this helper for authentication.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    return session.user;
  } catch (err) {
    console.error("Auth verification error:", err);
    return null;
  }
}
