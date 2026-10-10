import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { events } from "@/db/schema/events";
import { groups } from "@/db/schema/groups";
import { tasks } from "@/db/schema/tasks";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseCategoryPatch } from "@/lib/api/category-body";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/uuid";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  if (!isUuid(id)) return fail("Space not found", 404);
  const parsed = parseCategoryPatch(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);

  const [updatedCategory] = await db
    .update(categories)
    .set(parsed.value)
    .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
    .returning();

  if (!updatedCategory) {
    return fail("Space not found", 404);
  }

  return ok(updatedCategory);
});

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;
  if (!isUuid(id)) return fail("Space not found", 404);

  const result = await retryTransaction(() => db.transaction(async (tx) => {
    const [ownedCategory] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
      .for("update");
    if (!ownedCategory) return null;

    // Locking the Space first prevents new links while its events are
    // snapshotted. Event PATCH uses bounded deadlock/serialization retry
    // for the inverse event-then-Space lock path.
    const linkedEvents = await tx
      .select()
      .from(events)
      .where(and(eq(events.category_id, id), eq(events.user_id, user.id)))
      .for("update");

    const linkedTasks = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.category_id, id), eq(tasks.user_id, user.id)))
      .for("update");

    const detachedEvents = [];
    for (const event of linkedEvents) {
      const [detached] = await tx
        .update(events)
        .set({
          category_id: null,
          group_id: null,
          color: event.color_overridden ? event.color : (ownedCategory.color ?? event.color),
        })
        .where(and(eq(events.id, event.id), eq(events.user_id, user.id)))
        .returning();
      if (detached) detachedEvents.push(detached);
    }

    const detachedTasks = [];
    for (const task of linkedTasks) {
      const [detached] = await tx
        .update(tasks)
        .set({
          category_id: null,
          group_id: null,
          color: task.color_overridden ? task.color : (ownedCategory.color ?? task.color),
        })
        .where(and(eq(tasks.id, task.id), eq(tasks.user_id, user.id)))
        .returning();
      if (detached) detachedTasks.push(detached);
    }

    // Items already left their Groups above, so none can still point at one.
    const removedGroups = await tx
      .delete(groups)
      .where(and(eq(groups.category_id, id), eq(groups.user_id, user.id)))
      .returning();

    const [deletedCategory] = await tx
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
      .returning();
    if (!deletedCategory) throw new Error("Space disappeared during deletion");
    return { deletedCategory, detachedEvents, detachedTasks, removedGroups };
  }));

  if (!result) {
    return fail("Space not found", 404);
  }

  // Non-standard envelope: the detached events and tasks, and the Groups removed
  // with the Space, ride alongside it so the client can reconcile without a refetch.
  return NextResponse.json({
    success: true,
    data: result.deletedCategory,
    events: result.detachedEvents,
    tasks: result.detachedTasks,
    groups: result.removedGroups,
  });
});
