import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { parsePushSubscription, parsePushUnsubscribe } from "@/lib/api/push-body";
import { fail, ok, withUser } from "@/lib/api/route-handler";
import { and, eq } from "drizzle-orm";

/** Saves this device so closed-tab alerts can reach it. The same endpoint updates in place. */
export const POST = withUser(async (request, _context, user) => {
  const parsed = parsePushSubscription(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const body = parsed.value;

  const [saved] = await db
    .insert(pushSubscriptions)
    .values({
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_id: user.id,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: body.p256dh,
        auth: body.auth,
        user_id: user.id,
      },
    })
    .returning();

  return ok({ endpoint: saved.endpoint });
});

/** Stops closed-tab alerts on this device. Another user's row with that endpoint stays. */
export const DELETE = withUser(async (request, _context, user) => {
  const parsed = parsePushUnsubscribe(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);

  const [removed] = await db
    .delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.endpoint, parsed.value.endpoint),
      eq(pushSubscriptions.user_id, user.id),
    ))
    .returning();

  return ok({ removed: removed !== undefined });
});
