import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { events } from "@/db/schema/events";
import { groups } from "@/db/schema/groups";
import { tasks } from "@/db/schema/tasks";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseGroupPatch } from "@/lib/api/group-body";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  const parsed = parseGroupPatch(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);

  const [updated] = await db
    .update(groups)
    .set({ name: parsed.value.name })
    .where(and(eq(groups.id, id), eq(groups.user_id, user.id)))
    .returning();
  if (!updated) return fail("Group not found", 404);

  return ok(updated);
});

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;

  const result = await retryTransaction(() => db.transaction(async (tx) => {
    // Space first, then Group, then items: the order a Space delete takes, so
    // the two serialize instead of deadlocking.
    const [owned] = await tx
      .select()
      .from(groups)
      .where(and(eq(groups.id, id), eq(groups.user_id, user.id)));
    if (!owned) return null;

    const [space] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, owned.category_id), eq(categories.user_id, user.id)))
      .for("update");
    if (!space) return null;

    const [locked] = await tx
      .select()
      .from(groups)
      .where(and(eq(groups.id, id), eq(groups.user_id, user.id)))
      .for("update");
    if (!locked) return null;

    // category_id and color stay as they are: the items are still in the
    // Space, so their displayed color does not change.
    const releasedEvents = await tx
      .update(events)
      .set({ group_id: null })
      .where(and(eq(events.group_id, id), eq(events.user_id, user.id)))
      .returning();
    const releasedTasks = await tx
      .update(tasks)
      .set({ group_id: null })
      .where(and(eq(tasks.group_id, id), eq(tasks.user_id, user.id)))
      .returning();

    const [deleted] = await tx
      .delete(groups)
      .where(and(eq(groups.id, id), eq(groups.user_id, user.id)))
      .returning();
    if (!deleted) throw new Error("Group disappeared during deletion");
    return { deleted, releasedEvents, releasedTasks };
  }));

  if (!result) return fail("Group not found", 404);

  // Same envelope as Space deletion: the released items ride alongside the
  // deleted Group so the client can reconcile without a refetch.
  return NextResponse.json({
    success: true,
    data: result.deleted,
    events: result.releasedEvents,
    tasks: result.releasedTasks,
  });
});
