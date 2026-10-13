import type { AuthenticatedUser } from "@/lib/supabase/auth-user";

/**
 * An owner id this server read from its own tables. The brand is what the
 * owner-filter check requires. Callers must not pass an id taken from a request.
 */
export function storedUser(id: string): AuthenticatedUser {
  return { id } as AuthenticatedUser;
}
