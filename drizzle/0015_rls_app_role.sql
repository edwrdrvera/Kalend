-- A policy can only name a role that already exists. Login and table grants
-- come later, so this role cannot be used to connect yet.
do $$ begin
  if not exists (select from pg_roles where rolname = 'kalend_app') then
    create role kalend_app nologin nobypassrls noinherit;
  end if;
end $$;--> statement-breakpoint

-- One place that answers "who is the caller" for a policy. An empty setting
-- or a value that is not a uuid yields null, so the policy denies the row
-- instead of raising.
create or replace function public.app_user_id() returns uuid
  language plpgsql
  stable
  set search_path = pg_catalog
  as $fn$
begin
  return nullif(current_setting('app.user_id', true), '')::uuid;
exception
  when invalid_text_representation then
    return null;
end
$fn$;--> statement-breakpoint

drop policy "Users can only select their own events" on events;--> statement-breakpoint
drop policy "Users can only insert their own events" on events;--> statement-breakpoint
drop policy "Users can only update their own events" on events;--> statement-breakpoint
drop policy "Users can only delete their own events" on events;--> statement-breakpoint
create policy events_owner on events
  for all
  to kalend_app
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());--> statement-breakpoint

drop policy "Users can only select their own tasks" on tasks;--> statement-breakpoint
drop policy "Users can only insert their own tasks" on tasks;--> statement-breakpoint
drop policy "Users can only update their own tasks" on tasks;--> statement-breakpoint
drop policy "Users can only delete their own tasks" on tasks;--> statement-breakpoint
create policy tasks_owner on tasks
  for all
  to kalend_app
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());--> statement-breakpoint

drop policy "Users can only select their own categories" on categories;--> statement-breakpoint
drop policy "Users can only insert their own categories" on categories;--> statement-breakpoint
drop policy "Users can only update their own categories" on categories;--> statement-breakpoint
drop policy "Users can only delete their own categories" on categories;--> statement-breakpoint
create policy categories_owner on categories
  for all
  to kalend_app
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());--> statement-breakpoint

create policy groups_owner on groups
  for all
  to kalend_app
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());--> statement-breakpoint

create policy alerts_owner on alerts
  for all
  to kalend_app
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());--> statement-breakpoint

-- The waitlist insert does not read the new row back, so it needs no select policy.
create policy waitlist_public_insert on waitlist
  for insert
  to kalend_app
  with check (true);
