-- Reverses drizzle/0017_import_event_identity.sql. Run by hand; drizzle-kit never reads this folder.
-- Drops the import identity columns. Events stay. Their import markers go with the columns.
-- Run it in one transaction.
BEGIN;
ALTER TABLE "events" DROP CONSTRAINT "events_import_identity_pair";
DROP INDEX "events_import_identity_idx";
ALTER TABLE "events" DROP COLUMN "import_occurrence";
ALTER TABLE "events" DROP COLUMN "import_uid";
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0017:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
