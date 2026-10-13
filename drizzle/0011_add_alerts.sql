CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid,
	"task_id" uuid,
	"offset_minutes" integer NOT NULL,
	"fire_at" timestamp with time zone NOT NULL,
	"fired_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "alerts_event_offset_key" UNIQUE("event_id","offset_minutes"),
	CONSTRAINT "alerts_task_offset_key" UNIQUE("task_id","offset_minutes"),
	CONSTRAINT "alerts_exactly_one_item" CHECK (("alerts"."event_id" is null) <> ("alerts"."task_id" is null)),
	CONSTRAINT "alerts_offset_allowed" CHECK ("alerts"."offset_minutes" in (0, 5, 15, 60, 1440))
);
--> statement-breakpoint
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_user_fire_at_unfired_idx" ON "alerts" USING btree ("user_id","fire_at") WHERE "alerts"."fired_at" is null;--> statement-breakpoint

-- Same lockdown as the other tables (0010): the app reaches alerts only
-- through Drizzle as "postgres", so the REST and GraphQL roles get nothing.
REVOKE ALL PRIVILEGES ON TABLE "alerts" FROM anon, authenticated;--> statement-breakpoint
ALTER TABLE "alerts" FORCE ROW LEVEL SECURITY;
