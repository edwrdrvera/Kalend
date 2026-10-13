-- Reverses drizzle/0011. Run by hand; drizzle-kit never reads this folder.
-- Dropping the table deletes every stored alert. Alerts are derived from the
-- events and tasks they belong to, so no event or task data is lost.
DROP TABLE "alerts";
-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0011:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
