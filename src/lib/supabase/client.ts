import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

/**
 * Supabase client for use in Client Components ("use client").
 * Safe to call per-render; @supabase/ssr memoizes a singleton browser client
 * under the hood.
 */
export function createClient() {
  const config = getSupabaseConfig();

  return createBrowserClient(config.url, config.anonKey);
}
