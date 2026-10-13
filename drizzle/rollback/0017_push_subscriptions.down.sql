-- Reverses drizzle/0017_push_subscriptions.sql. Run by hand; drizzle-kit never reads this folder.
-- Drops the device subscription table, and with it the row policy and the app role grant.
-- No other table changes. Run it in one transaction.
BEGIN;
DROP TABLE "push_subscriptions";
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0017:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
