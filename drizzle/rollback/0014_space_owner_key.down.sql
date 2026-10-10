-- Reverses drizzle/0014_space_owner_key.sql. Run by hand; drizzle-kit never reads this folder.
-- Restores the single-column Space keys from 0004. No rows change. Run it in one transaction.
BEGIN;
ALTER TABLE "events" DROP CONSTRAINT "events_space_owner_fk";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_space_owner_fk";
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0014:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
