import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { membershipErrorMessage, resolveItemMembership } from "@/lib/api/membership";
import { parseTaskCreate } from "@/lib/api/task-body";
import { UNASSIGNED } from "@/lib/membership";
import { retryTransaction } from "@/lib/transaction-retry";
import { eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.user_id, user.id));

  return ok(userTasks);
});

export const POST = withUser(async (request, _context, user) => {
  const parsed = parseTaskCreate(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const body = parsed.value;

  // The Space (and Group) stay locked until the insert commits, so a delete
  // cannot slip in between the ownership check and the new task.
  const result = await retryTransaction(() => db.transaction(async (tx) => {
    const resolved = await resolveItemMembership(tx, user, UNASSIGNED, {
      category_id: body.category_id,
      group_id: body.group_id,
    });
    if (!resolved.ok) return resolved;

    const [newTask] = await tx
      .insert(tasks)
      .values({
        title: body.title,
        // Omit the key entirely when no due date was given, instead of
        // passing `due_at: undefined`, so the column gets a real `null`
        // rather than an explicit-but-empty insert value.
        ...(body.due_at != null ? { due_at: body.due_at } : {}),
        user_id: user.id,
        color: body.color,
        color_overridden: body.color_overridden ?? false,
        category_id: resolved.membership.category_id,
        group_id: resolved.membership.group_id,
      })
      .returning();
    return { ok: true, task: newTask } as const;
  }));
  if (!result.ok) return fail(membershipErrorMessage(result.error), 400);

  return ok(result.task, { status: 201 });
});
