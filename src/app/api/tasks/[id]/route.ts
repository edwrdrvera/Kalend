import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { membershipErrorMessage, resolveItemMembership } from "@/lib/api/membership";
import { parseTaskPatch } from "@/lib/api/task-body";
import { membershipOf, touchesMembership } from "@/lib/membership";
import { rescheduleAlerts } from "@/lib/api/alert-sync";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";
import { isUuid } from "@/lib/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  if (!isUuid(id)) return fail("Task not found", 404);
  const parsed = parseTaskPatch(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const updates = parsed.value;

  // The task and its alerts change together, so an alert never keeps a fire
  // time that no longer matches the due date. The membership check shares the
  // transaction so the Space and Group stay locked until the write commits.
  const result = await retryTransaction(() => db.transaction(async (tx) => {
    const set: Partial<typeof tasks.$inferInsert> = { ...updates };
    // Only a membership change needs the stored row, so completing or
    // retitling a task stays a single update.
    if (touchesMembership(updates)) {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
        .for("update");
      if (!existing) return null;
      const resolved = await resolveItemMembership(tx, user, membershipOf(existing), {
        category_id: updates.category_id,
        group_id: updates.group_id,
      });
      if (!resolved.ok) return resolved;
      set.category_id = resolved.membership.category_id;
      set.group_id = resolved.membership.group_id;
    }

    const [updated] = await tx
      .update(tasks)
      .set(set)
      .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
      .returning();
    if (updated && updates.due_at !== undefined) {
      await rescheduleAlerts(tx, user, { kind: "task", id }, updates.due_at, new Date());
    }
    return updated ? ({ ok: true, task: updated } as const) : null;
  }));

  if (!result) return fail("Task not found", 404);
  if (!result.ok) return fail(membershipErrorMessage(result.error), 400);

  return ok(result.task);
});

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;
  if (!isUuid(id)) return fail("Task not found", 404);

  const [deletedTask] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
    .returning();

  if (!deletedTask) {
    return fail("Task not found", 404);
  }

  return ok(deletedTask);
});
