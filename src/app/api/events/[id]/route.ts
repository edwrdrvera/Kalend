import { db } from "@/db";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseEventPatch } from "@/lib/api/event-body";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";

interface RouteContext { params: Promise<{ id: string }>; }
const badRequest = (error: string) => fail(error, 400);

export const PATCH = withUser(async (request, { params }: RouteContext, user) => {
  const { id } = await params;
  const parsed = parseEventPatch(await request.json());
  if (!parsed.ok) return badRequest(parsed.error);
  const body = parsed.value;

  const result = await retryTransaction(() => db.transaction(async (tx) => {
    const [existing] = await tx.select().from(events).where(and(eq(events.id, id), eq(events.user_id, user.id))).for("update");
    if (!existing) return null;
    const targetCategoryId = body.category_id === undefined ? existing.category_id : body.category_id;
    let targetCategory = null;
    if (targetCategoryId) {
      [targetCategory] = await tx.select().from(categories).where(and(eq(categories.id, targetCategoryId), eq(categories.user_id, user.id))).for("update");
      if (!targetCategory) return { categoryError: true } as const;
    }
    let visibleColor = existing.color;
    if (existing.category_id && !existing.color_overridden) {
      const [oldCategory] = await tx.select().from(categories).where(and(eq(categories.id, existing.category_id), eq(categories.user_id, user.id)));
      if (oldCategory) visibleColor = oldCategory.color ?? existing.color;
    }
    // The parsed body holds only the fields that were sent, keyed by column.
    const updates: Partial<typeof events.$inferInsert> = { ...body };
    if (body.color === undefined && (body.category_id === null || (body.color_overridden === false && !targetCategory))) updates.color = visibleColor;
    if ((body.start_at ?? existing.start_at) >= (body.end_at ?? existing.end_at)) return { timeError: true } as const;
    const [updated] = await tx.update(events).set(updates).where(and(eq(events.id, id), eq(events.user_id, user.id))).returning();
    return { updated } as const;
  }));
  if (!result) return fail("Event not found", 404);
  if ("categoryError" in result) return badRequest("The selected Space is unavailable");
  if ("timeError" in result) return badRequest("start_at must be before end_at");
  return ok(result.updated);
});

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;
  const [deletedEvent] = await db.delete(events).where(and(eq(events.id, id), eq(events.user_id, user.id))).returning();
  if (!deletedEvent) return fail("Event not found", 404);
  return ok(deletedEvent);
});
