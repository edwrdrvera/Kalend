import { db } from "@/db";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseEventCreate } from "@/lib/api/event-body";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userEvents = await db
    .select()
    .from(events)
    .where(eq(events.user_id, user.id));

  return ok(userEvents);
});

export const POST = withUser(async (request, _context, user) => {
  const parsed = parseEventCreate(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const body = parsed.value;

  const result = await retryTransaction(() => db.transaction(async (tx) => {
    let category = null;
    if (body.category_id) {
      [category] = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.id, body.category_id), eq(categories.user_id, user.id)))
        .for("update");
      if (!category) return null;
    }

    const [newEvent] = await tx
      .insert(events)
      .values({
        title: body.title,
        start_at: body.start_at,
        end_at: body.end_at,
        user_id: user.id,
        color: body.color,
        color_overridden: body.color_overridden ?? false,
        category_id: body.category_id ?? null,
        location: body.location ?? null,
        icon: body.icon ?? null,
      })
      .returning();
    return newEvent;
  }));
  if (!result) {
    return fail("The selected Space is unavailable", 400);
  }

  return ok(result, { status: 201 });
});
