-- Reverses drizzle/0015_rls_app_role.sql. Run by hand; drizzle-kit never reads this folder.
-- If the later grant migration was applied, run its reverse script first.
-- Restoring the previous policies needs auth.uid(), which Supabase and CI provide.
BEGIN;

drop policy if exists events_owner on events;
drop policy if exists tasks_owner on tasks;
drop policy if exists categories_owner on categories;
drop policy if exists groups_owner on groups;
drop policy if exists alerts_owner on alerts;
drop policy if exists waitlist_public_insert on waitlist;

create policy "Users can only select their own events" on events for select using (auth.uid() = user_id);
create policy "Users can only insert their own events" on events for insert with check (auth.uid() = user_id);
create policy "Users can only update their own events" on events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can only delete their own events" on events for delete using (auth.uid() = user_id);

create policy "Users can only select their own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can only insert their own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can only update their own tasks" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can only delete their own tasks" on tasks for delete using (auth.uid() = user_id);

create policy "Users can only select their own categories" on categories for select using (auth.uid() = user_id);
create policy "Users can only insert their own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users can only update their own categories" on categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can only delete their own categories" on categories for delete using (auth.uid() = user_id);

drop function if exists public.app_user_id();
drop role if exists kalend_app;

-- Keep drizzle's bookkeeping in step so a later migrate does not skip 0015:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
COMMIT;
