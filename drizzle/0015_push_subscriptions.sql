CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE("endpoint"),
	CONSTRAINT "push_subscriptions_endpoint_https" CHECK (left("push_subscriptions"."endpoint", 8) = 'https://' and char_length("push_subscriptions"."endpoint") between 9 and 2048 and position(' ' in "push_subscriptions"."endpoint") = 0),
	CONSTRAINT "push_subscriptions_keys_bounded" CHECK (char_length("push_subscriptions"."p256dh") between 1 and 200 and char_length("push_subscriptions"."auth") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint

-- Same lockdown as the other tables (0010, 0011): the app reaches this table only
-- through Drizzle as "postgres", so the REST and GraphQL roles get nothing.
REVOKE ALL PRIVILEGES ON TABLE "push_subscriptions" FROM anon, authenticated;--> statement-breakpoint
ALTER TABLE "push_subscriptions" FORCE ROW LEVEL SECURITY;