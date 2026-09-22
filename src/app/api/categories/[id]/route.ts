import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { events } from "@/db/schema/events";
import { tasks } from "@/db/schema/tasks";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { isEventColor } from "@/lib/event-colors";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateCategoryBody {
  name?: unknown;
  color?: unknown;
}

const badRequest = (error: string) => fail(error, 400);

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  const parsed: unknown = await request.json();

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return badRequest("Request body must be an object");
  }
  const body = parsed as UpdateCategoryBody;

  const updates: Partial<typeof categories.$inferInsert> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return badRequest("name must be a string");
    }
    if (!body.name.trim()) {
      return fail("name is required", 400);
    }
    updates.name = body.name.trim();
  }

  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !isEventColor(body.color)) {
      return fail("color must be a supported color", 400);
    }
    updates.color = body.color as string;
  }

  if (Object.keys(updates).length === 0) {
    return fail("No updatable fields provided", 400);
  }

  const [updatedCategory] = await db
    .update(categories)
    .set(updates)
    .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
    .returning();

  if (!updatedCategory) {
    return fail("Space not found", 404);
  }

  return ok(updatedCategory);
});

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;

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
          color: task.color_overridden ? task.color : (ownedCategory.color ?? task.color),
        })
        .where(and(eq(tasks.id, task.id), eq(tasks.user_id, user.id)))
        .returning();
      if (detached) detachedTasks.push(detached);
    }

    const [deletedCategory] = await tx
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
      .returning();
    if (!deletedCategory) throw new Error("Space disappeared during deletion");
    return { deletedCategory, detachedEvents, detachedTasks };
  }));

  if (!result) {
    return fail("Space not found", 404);
  }

  // Non-standard envelope: the detached events and tasks ride alongside the
  // deleted Space so the client can reconcile their colors without a refetch.
  return NextResponse.json({
    success: true,
    data: result.deletedCategory,
    events: result.detachedEvents,
    tasks: result.detachedTasks,
  });
});
