-- Reverses drizzle/0016_kalend_app_role.sql. Run by hand; drizzle-kit never reads this folder.
-- Leaves the role in place. The previous migration's policies still name it.
-- Login is turned back off. The password, if one was set outside git, is cleared.
BEGIN;

revoke all privileges on table events, tasks, categories, groups, alerts, waitlist from kalend_app;
revoke usage on schema public from kalend_app;
alter role kalend_app with nologin password null;

-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0016:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
