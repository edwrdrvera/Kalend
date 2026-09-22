import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { isEventColor } from "@/lib/event-colors";
import { and, eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.user_id, user.id));

  return ok(userTasks);
});

interface CreateTaskBody {
  title: string;
  due_at?: string;
  color?: string;
  color_overridden?: boolean;
  category_id?: string | null;
}

export const POST = withUser(async (request, _context, user) => {
  const body: CreateTaskBody = await request.json();

  if (!body.title || !body.title.trim()) {
    return fail("title is required", 400);
  }

  let dueAt: Date | undefined;
  if (body.due_at !== undefined) {
    dueAt = new Date(body.due_at);
    if (Number.isNaN(dueAt.getTime())) {
      return fail("due_at must be a valid date", 400);
    }
  }

  if (body.color !== undefined && !isEventColor(body.color)) {
    return fail("color must be a supported color", 400);
  }

  // This ownership check and the insert below stay two round trips rather
  // than one combined query. Merging them needs either an insert-from-select
  // (which requires fabricating id/created_at client-side since Postgres
  // only applies column defaults to columns omitted from the target list,
  // not ones populated by a SELECT) or a scalar subquery inside category_id
  // with a rollback DELETE when it resolves to null. Both trade a well
  // understood, easily verified query for a harder-to-verify one, for a
  // saving that's now marginal: both queries hit the same local Postgres
  // instance, and the auth check that used to precede them (see
  // getAuthenticatedUser()) no longer costs a network round trip.
  if (body.category_id) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, body.category_id), eq(categories.user_id, user.id)));
    if (!cat) {
      return fail("The selected Space is unavailable", 400);
    }
  }

  const [newTask] = await db
    .insert(tasks)
    .values({
      title: body.title,
      // Omit the key entirely when no due date was given, instead of
      // passing `due_at: undefined`, so the column gets a real `null`
      // rather than an explicit-but-empty insert value.
      ...(dueAt !== undefined ? { due_at: dueAt } : {}),
      user_id: user.id,
      color: body.color,
      color_overridden: body.color_overridden ?? false,
      category_id: body.category_id ?? null,
    })
    .returning();

  return ok(newTask, { status: 201 });
});
