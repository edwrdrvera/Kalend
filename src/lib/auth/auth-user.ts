import { headers } from "next/headers";
import { AUTH_USER_ID_HEADER } from "./middleware";
import { auth } from "./server";

declare const signedIn: unique symbol;

/**
 * Minimal shape returned to route handlers. Every handler only ever uses
 * `.id` to scope queries by owner (see `src/app/api/CLAUDE.md`), so the
 * helper deliberately doesn't return the full session user.
 */
export interface AuthenticatedUser {
  readonly id: string;
  /** Only getAuthenticatedUser makes one, so a helper typed to take it can't be handed a request field. */
  readonly [signedIn]: true;
}

/**
 * Returns the signed-in user, or null.
 *
 * Fast path: `src/proxy.ts` validates the session on every matched route and
 * forwards the user id as `AUTH_USER_ID_HEADER`, after stripping any inbound
 * copy, so the header is trusted here.
 *
 * Fallback: without the header (a route the matcher doesn't cover, a direct
 * hit), look the session up from the request cookies so nothing is trusted
 * unverified.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headerStore = await headers();
    const forwardedId = headerStore.get(AUTH_USER_ID_HEADER);
    if (forwardedId) {
      return { id: forwardedId } as AuthenticatedUser;
    }

    const session = await auth.api.getSession({ headers: headerStore });
    return session ? ({ id: session.user.id } as AuthenticatedUser) : null;
  } catch (err) {
    console.error("Auth verification error:", err);
    return null;
  }
}
