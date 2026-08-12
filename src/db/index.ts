import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/events";

// NOTE ON ROW LEVEL SECURITY: `events` and `tasks` have RLS policies
// (drizzle/0002_enable_events_rls.sql, drizzle/0003_enable_tasks_rls.sql),
// but they do NOT protect the queries made through this client. This
// connection authenticates as Supabase's "postgres" role, which has
// BYPASSRLS set directly on it and skips RLS unconditionally, and it never
// carries a per-request Supabase JWT for `auth.uid()` to read anyway. The
// actual access control for this app is the `eq(<table>.user_id, user.id)`
// filter written into every API route (see src/app/api/*). RLS here is
// baseline hygiene for any other connection path (e.g. Supabase's
// PostgREST/anon-key access), not a backstop for this client. See issue #61.
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
