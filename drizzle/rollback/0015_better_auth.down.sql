-- Reverses drizzle/0015_better_auth.sql. Run by hand; drizzle-kit never reads this folder.
-- Drops Better Auth's tables and the owner foreign keys, then turns row level
-- security back on. Policies from earlier migrations stay, so the schema matches
-- 0014 on Supabase again. App rows stay, with plain user ids. Run it in one transaction.
BEGIN;
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_user_id_user_id_fk";
ALTER TABLE "categories" DROP CONSTRAINT "categories_user_id_user_id_fk";
ALTER TABLE "events" DROP CONSTRAINT "events_user_id_user_id_fk";
ALTER TABLE "groups" DROP CONSTRAINT "groups_user_id_user_id_fk";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_user_id_user_id_fk";
DROP TABLE "account";
DROP TABLE "session";
DROP TABLE "verification";
DROP TABLE "user";
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0015:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
