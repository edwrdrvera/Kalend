-- Reverses drizzle/0013_add_groups.sql. Run by hand; drizzle-kit never reads this folder.
-- An item in a Group already carries that Group's Space in category_id (the composite key
-- forces it), so dropping group_id leaves every event and task in its Space. The UPDATEs
-- below restate that rule so the reverse stays correct even if the key was dropped by hand
-- first. Groups themselves are deleted. Run it in one transaction.
BEGIN;
UPDATE "events" SET "category_id" = "groups"."category_id" FROM "groups" WHERE "events"."group_id" = "groups"."id" AND "events"."user_id" = "groups"."user_id" AND "events"."category_id" IS DISTINCT FROM "groups"."category_id";
UPDATE "tasks" SET "category_id" = "groups"."category_id" FROM "groups" WHERE "tasks"."group_id" = "groups"."id" AND "tasks"."user_id" = "groups"."user_id" AND "tasks"."category_id" IS DISTINCT FROM "groups"."category_id";
ALTER TABLE "events" DROP CONSTRAINT "events_group_membership_fk", DROP CONSTRAINT "events_group_needs_space", DROP COLUMN "group_id";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_group_membership_fk", DROP CONSTRAINT "tasks_group_needs_space", DROP COLUMN "group_id";
DROP TABLE "groups";
ALTER TABLE "categories" DROP CONSTRAINT "categories_id_user_key";
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0013:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
