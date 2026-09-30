-- Reverses drizzle/0010 to the grants captured from production on
-- 2026-09-29. Run by hand; drizzle-kit never reads this folder. Restoring
-- these grants reopens REST and GraphQL access, so prefer a narrower fix.
GRANT ALL PRIVILEGES ON TABLE "categories", "events", "tasks", "waitlist" TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated;
ALTER TABLE "waitlist" NO FORCE ROW LEVEL SECURITY;
