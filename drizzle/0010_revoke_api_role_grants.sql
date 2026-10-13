-- The app reaches these tables only through Drizzle as "postgres". The anon
-- and authenticated roles exist for Supabase's REST and GraphQL APIs, which
-- Kalend doesn't use, so they get no table access at all. RLS stays on as a
-- second layer, but TRUNCATE ignores RLS, so the grants themselves must go.
REVOKE ALL PRIVILEGES ON TABLE "categories", "events", "tasks", "waitlist" FROM anon, authenticated;--> statement-breakpoint

-- Without this, every table "postgres" creates later is granted to both
-- roles again. Rows owned by supabase_admin can't be changed from here.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;--> statement-breakpoint

-- Matches the FORCE on events, tasks, and categories (0002, 0003, 0005).
ALTER TABLE "waitlist" FORCE ROW LEVEL SECURITY;
