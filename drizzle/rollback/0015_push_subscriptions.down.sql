-- Reverses drizzle/0015_push_subscriptions.sql. Run by hand; drizzle-kit never reads this folder.
-- Drops the device subscription table. No other table changes. Run it in one transaction.
BEGIN;
DROP TABLE "push_subscriptions";
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0015:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
