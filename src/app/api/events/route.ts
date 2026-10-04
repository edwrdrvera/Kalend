import { db } from "@/db";
import { events } from "@/db/schema/events";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseEventCreate } from "@/lib/api/event-body";
import { membershipErrorMessage, resolveItemMembership } from "@/lib/api/membership";
import { UNASSIGNED } from "@/lib/membership";
import { retryTransaction } from "@/lib/transaction-retry";
import { eq } from "drizzle-orm";

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
    const resolved = await resolveItemMembership(tx, user, UNASSIGNED, {
      category_id: body.category_id,
      group_id: body.group_id,
    });
    if (!resolved.ok) return resolved;

    const [newEvent] = await tx
      .insert(events)
      .values({
        title: body.title,
        start_at: body.start_at,
        end_at: body.end_at,
        user_id: user.id,
        color: body.color,
        color_overridden: body.color_overridden ?? false,
        category_id: resolved.membership.category_id,
        group_id: resolved.membership.group_id,
        location: body.location ?? null,
        icon: body.icon ?? null,
        description: body.description ?? null,
      })
      .returning();
    return { ok: true, event: newEvent } as const;
  }));
  if (!result.ok) return fail(membershipErrorMessage(result.error), 400);

  return ok(result.event, { status: 201 });
});
