import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { isEventColor } from "@/lib/event-colors";
import { and, eq } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateTaskBody {
  title?: string;
  due_at?: string | null;
  completed?: boolean;
  color?: string;
  color_overridden?: boolean;
  // string sets the link, null clears it (falls back to `color`), omitted
  // leaves it untouched — same convention as `due_at` above.
  category_id?: string | null;
}

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  const body: UpdateTaskBody = await request.json();

  if (body.color !== undefined && !isEventColor(body.color)) {
    return fail("color must be a supported color", 400);
  }

  // Validate category ownership when setting (not clearing) a category.
  if (body.category_id) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, body.category_id), eq(categories.user_id, user.id)));
    if (!cat) {
      return fail("The selected Space is unavailable", 400);
    }
  }

  const updates: Partial<typeof tasks.$inferInsert> = {};

  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return fail("title is required", 400);
    }
    updates.title = body.title;
  }

  if (body.completed !== undefined) updates.completed = body.completed;
  if (body.color !== undefined) updates.color = body.color;
  if (body.color_overridden !== undefined) updates.color_overridden = body.color_overridden;
  if (body.category_id !== undefined) updates.category_id = body.category_id;

  // due_at: null explicitly clears the due date (moves the task back to
  // the undated inbox); omitted leaves it untouched.
  if (body.due_at !== undefined) {
    if (body.due_at === null) {
      updates.due_at = null;
    } else {
      const dueAt = new Date(body.due_at);
      if (Number.isNaN(dueAt.getTime())) {
        return fail("due_at must be a valid date", 400);
      }
      updates.due_at = dueAt;
    }
  }

  if (Object.keys(updates).length === 0) {
    return fail("No updatable fields provided", 400);
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
