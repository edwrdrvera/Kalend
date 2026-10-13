-- Enable Row Level Security (RLS) on the events table
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;

-- NOTE: FORCE does not help here. The app's own DATABASE_URL connection
-- (src/db/index.ts) authenticates as "postgres", which has BYPASSRLS set
-- directly on the role (see issue #61) -- that unconditionally skips RLS,
-- FORCE or not. It's included anyway as correct baseline hygiene for any
-- other connection path (e.g. Supabase's PostgREST/anon-key access) that
-- isn't already exempt.
ALTER TABLE "events" FORCE ROW LEVEL SECURITY;

-- Allow users to only view their own events
CREATE POLICY "Users can only select their own events"
ON "events" FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to only insert events for themselves
CREATE POLICY "Users can only insert their own events"
ON "events" FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to only update their own events
CREATE POLICY "Users can only update their own events"
ON "events" FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to only delete their own events
CREATE POLICY "Users can only delete their own events"
ON "events" FOR DELETE
USING (auth.uid() = user_id);
