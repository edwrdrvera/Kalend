-- Hand-edited from drizzle-kit's output in three places: the unique key on categories
-- moves ahead of the foreign key that needs it, the item foreign keys use
-- SET NULL ("group_id") so deleting a Group does not also clear category_id and push the
-- items out of their Space (drizzle-kit cannot emit a column list; needs Postgres 15+),
-- and the lockdown from 0011 is appended.
ALTER TABLE "categories" ADD CONSTRAINT "categories_id_user_key" UNIQUE("id","user_id");--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "groups_membership_key" UNIQUE("id","category_id","user_id"),
	CONSTRAINT "groups_name_not_blank" CHECK (btrim("groups"."name") <> '' and char_length("groups"."name") <= 100)
);
--> statement-breakpoint
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_space_owner_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_user_space_idx" ON "groups" USING btree ("user_id","category_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_membership_fk" FOREIGN KEY ("group_id","category_id","user_id") REFERENCES "public"."groups"("id","category_id","user_id") ON DELETE set null ("group_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_membership_fk" FOREIGN KEY ("group_id","category_id","user_id") REFERENCES "public"."groups"("id","category_id","user_id") ON DELETE set null ("group_id") ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_group_idx" ON "events" USING btree ("group_id") WHERE "events"."group_id" is not null;--> statement-breakpoint
CREATE INDEX "tasks_group_idx" ON "tasks" USING btree ("group_id") WHERE "tasks"."group_id" is not null;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_needs_space" CHECK ("events"."group_id" is null or "events"."category_id" is not null);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_needs_space" CHECK ("tasks"."group_id" is null or "tasks"."category_id" is not null);--> statement-breakpoint

-- Same lockdown as the other tables (0010, 0011): the app reaches groups only
-- through Drizzle as "postgres", so the REST and GraphQL roles get nothing.
REVOKE ALL PRIVILEGES ON TABLE "groups" FROM anon, authenticated;--> statement-breakpoint
ALTER TABLE "groups" FORCE ROW LEVEL SECURITY;
