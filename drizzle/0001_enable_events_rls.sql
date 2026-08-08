-- Enable Row Level Security (RLS) on the events table
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;

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
