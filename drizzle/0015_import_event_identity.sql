ALTER TABLE "events" ADD COLUMN "import_uid" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "import_occurrence" text;--> statement-breakpoint
CREATE UNIQUE INDEX "events_import_identity_idx" ON "events" USING btree ("user_id","import_uid","import_occurrence") WHERE "events"."import_uid" is not null;