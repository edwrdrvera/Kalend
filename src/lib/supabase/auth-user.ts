import { createClient } from "./server";
import type { User } from "@supabase/supabase-js";

/**
 * Retrieves the currently authenticated Supabase user on the server.
 * Returns null if the user is unauthenticated or if the session token is invalid.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error("Auth verification error:", err);
    return null;
  }
}
