import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseTaskPatch } from "@/lib/api/task-body";
import { and, eq } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  const parsed = parseTaskPatch(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const updates = parsed.value;

  // Validate category ownership when setting (not clearing) a category.
  if (updates.category_id) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, updates.category_id), eq(categories.user_id, user.id)));
    if (!cat) {
      return fail("The selected Space is unavailable", 400);
    }
  }

  const [updatedTask] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
    .returning();

  if (!updatedTask) {
    return fail("Task not found", 404);
  }

  return ok(updatedTask);
});

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;

  const [deletedTask] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
    .returning();

  if (!deletedTask) {
    return fail("Task not found", 404);
  }

  return ok(deletedTask);
});
