-- Enable Row Level Security (RLS) on the tasks table
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

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
