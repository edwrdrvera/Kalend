-- Login stays passwordless in git. Set the password on the server, outside this repo.
do $$ begin
  if not exists (select from pg_roles where rolname = 'kalend_app') then
    create role kalend_app login nobypassrls noinherit;
  end if;
end $$;--> statement-breakpoint

alter role kalend_app with login nobypassrls noinherit;--> statement-breakpoint

grant usage on schema public to kalend_app;--> statement-breakpoint

grant select, insert, update, delete on events, tasks, categories, groups, alerts to kalend_app;--> statement-breakpoint

grant insert on waitlist to kalend_app;--> statement-breakpoint

grant execute on function public.app_user_id() to kalend_app;

-- No default privileges. A blanket grant would hand every future table to this
-- role, including tables that must stay owner-only. Grant each new table in its own migration.
