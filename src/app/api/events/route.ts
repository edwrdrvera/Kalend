import { db } from "@/db";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { isEventColor } from "@/lib/event-colors";
import { retryTransaction } from "@/lib/transaction-retry";
import { isUuid } from "@/lib/uuid";
import { and, eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userEvents = await db
    .select()
    .from(events)
    .where(eq(events.user_id, user.id));

  return ok(userEvents);
});

interface CreateEventBody {
  title?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  color?: unknown;
  color_overridden?: unknown;
  category_id?: unknown;
  location?: unknown;
  icon?: unknown;
}

const MAX_LOCATION_LENGTH = 500;
const MAX_ICON_LENGTH = 10;

export const POST = withUser(async (request, _context, user) => {
  const parsed: unknown = await request.json();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("Request body must be an object", 400);
  }
  const body = parsed as CreateEventBody;

  if (typeof body.title !== "string" || !body.title.trim() || typeof body.start_at !== "string" || typeof body.end_at !== "string") {
    return fail("title, start_at, and end_at are required", 400);
  }

  const startAt = new Date(body.start_at);
  const endAt = new Date(body.end_at);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return fail("start_at and end_at must be valid dates", 400);
  }

  if (startAt >= endAt) {
    return fail("start_at must be before end_at", 400);
  }

  if (body.color !== undefined && (typeof body.color !== "string" || !isEventColor(body.color))) {
    return fail("color must be a supported color", 400);
  }

  if (body.color_overridden !== undefined && typeof body.color_overridden !== "boolean") {
    return fail("color_overridden must be a boolean", 400);
  }
  if (body.category_id !== undefined && body.category_id !== null && (typeof body.category_id !== "string" || !isUuid(body.category_id))) {
    return fail("Space must be a valid identifier", 400);
  }
  if (body.location !== undefined && body.location !== null && (typeof body.location !== "string" || body.location.length > MAX_LOCATION_LENGTH)) {
    return fail(`location must be a string of at most ${MAX_LOCATION_LENGTH} characters`, 400);
  }
  if (body.icon !== undefined && body.icon !== null && (typeof body.icon !== "string" || body.icon.length > MAX_ICON_LENGTH)) {
    return fail(`icon must be a string of at most ${MAX_ICON_LENGTH} characters`, 400);
  }

  const result = await retryTransaction(() => db.transaction(async (tx) => {
    let category = null;
    if (body.category_id) {
      [category] = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.id, body.category_id as string), eq(categories.user_id, user.id)))
        .for("update");
      if (!category) return null;
    }

    const [newEvent] = await tx
      .insert(events)
      .values({
        title: (body.title as string).trim(),
        start_at: startAt,
        end_at: endAt,
        user_id: user.id,
        color: body.color as string | undefined,
        color_overridden: body.color_overridden as boolean | undefined ?? false,
        category_id: (body.category_id as string | null | undefined) ?? null,
        location: (body.location as string | null | undefined) ?? null,
        icon: (body.icon as string | null | undefined) ?? null,
      })
      .returning();
    return newEvent;
  }));
  if (!result) {
    return fail("The selected Space is unavailable", 400);
  }

  return ok(result, { status: 201 });
});
