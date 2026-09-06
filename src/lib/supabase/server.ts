import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Must be created fresh per request (do not module-cache the
 * instance) since it captures the request's cookies.
 *
 * Note: `setAll` will throw when called from a Server Component (which can't
 * set cookies). That's expected and safe to ignore as long as session
 * refreshing happens in middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const config = getSupabaseConfig();

  return createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore if middleware is
            // refreshing the user session.
          }
        },
      },
    }
  );
}
