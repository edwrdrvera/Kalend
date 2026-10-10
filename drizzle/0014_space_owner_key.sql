-- Hand-edited from drizzle-kit's output: the Space keys use SET NULL ("category_id").
-- drizzle-kit emits a plain SET NULL, which would also clear the NOT NULL user_id and
-- fail every Space delete (drizzle-kit cannot emit a column list; needs Postgres 15+).
-- The ADD fails if an item already points at another user's Space. Find those rows with:
--   SELECT 'events', e.id FROM events e JOIN categories c ON c.id = e.category_id WHERE c.user_id <> e.user_id
--   UNION ALL SELECT 'tasks', t.id FROM tasks t JOIN categories c ON c.id = t.category_id WHERE c.user_id <> t.user_id;
ALTER TABLE "events" DROP CONSTRAINT "events_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_space_owner_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE set null ("category_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_space_owner_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE set null ("category_id") ON UPDATE no action;
