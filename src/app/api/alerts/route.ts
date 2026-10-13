import { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseAlertCreate } from "@/lib/api/alert-body";
import { lockAlertTime } from "@/lib/api/alert-sync";
import { fireAtFor } from "@/lib/alerts";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userAlerts = await db.select().from(alerts).where(eq(alerts.user_id, user.id));
  return ok(userAlerts);
});

export const POST = withUser(async (request, _context, user) => {
  const parsed = parseAlertCreate(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const { target, offset_minutes } = parsed.value;

  const result = await retryTransaction(() => db.transaction(async (tx) => {
    const item = await lockAlertTime(tx, user, target);
    // A foreign id looks exactly like a missing one.
    if (!item.exists) return { notFound: true } as const;
    if (item.at === null) return { undated: true } as const;

    const itemColumn = target.kind === "event" ? alerts.event_id : alerts.task_id;
    // A conflicting alert can be deleted between the insert and the read, so
    // insert again once rather than answer with no alert.
    for (let attempt = 0; attempt < 2; attempt++) {
      const [created] = await tx
        .insert(alerts)
        .values({
          event_id: target.kind === "event" ? target.id : null,
          task_id: target.kind === "task" ? target.id : null,
          offset_minutes,
          fire_at: fireAtFor(item.at, offset_minutes),
          user_id: user.id,
        })
        .onConflictDoNothing()
        .returning();
      if (created) return { alert: created, status: 201 } as const;

      // The same alert already exists, so asking again returns it unchanged.
      const [existing] = await tx
        .select()
        .from(alerts)
        .where(and(eq(itemColumn, target.id), eq(alerts.offset_minutes, offset_minutes), eq(alerts.user_id, user.id)));
      if (existing) return { alert: existing, status: 200 } as const;
    }
    throw new Error("Alert was removed twice while it was being added");
  }));

  if ("notFound" in result) return fail(`${parsed.value.target.kind === "event" ? "Event" : "Task"} not found`, 404);
  if ("undated" in result) return fail("A task needs a due date before it can have an alert", 400);
  return ok(result.alert, { status: result.status });
});
