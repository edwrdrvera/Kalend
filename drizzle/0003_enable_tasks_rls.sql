-- Enable Row Level Security (RLS) on the tasks table
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

-- NOTE: FORCE does not help here. The app's own DATABASE_URL connection
-- (src/db/index.ts) authenticates as "postgres", which has BYPASSRLS set
-- directly on the role (see issue #61) -- that unconditionally skips RLS,
-- FORCE or not. It's included anyway as correct baseline hygiene for any
-- other connection path (e.g. Supabase's PostgREST/anon-key access) that
-- isn't already exempt.
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

-- Allow users to only view their own tasks
CREATE POLICY "Users can only select their own tasks"
ON "tasks" FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to only insert tasks for themselves
CREATE POLICY "Users can only insert their own tasks"
ON "tasks" FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to only update their own tasks
CREATE POLICY "Users can only update their own tasks"
ON "tasks" FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to only delete their own tasks
CREATE POLICY "Users can only delete their own tasks"
ON "tasks" FOR DELETE
USING (auth.uid() = user_id);
