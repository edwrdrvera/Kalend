import { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { events } from "@/db/schema/events";
import { tasks } from "@/db/schema/tasks";
import { withUser, ok } from "@/lib/api/route-handler";
import { isMissed } from "@/lib/alerts";
import type { AlertClaim, ClaimedAlert } from "@/lib/calendar-types";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";

/**
 * Hands the caller every alert that is due and has not fired. The single
 * UPDATE marks them fired as it returns them, and Postgres re-checks the
 * `fired_at is null` condition once a competing claim releases a row, so
 * across reloads and tabs each alert is handed out once. The titles are read
 * in the same transaction so a failure there un-claims the alerts instead of
 * losing them.
 */
export const POST = withUser(async (_request, _context, user) => {
  const now = new Date();

  const claim = await retryTransaction(() => db.transaction(async (tx): Promise<AlertClaim> => {
    const claimed = await tx
      .update(alerts)
      .set({ fired_at: now })
      .where(and(eq(alerts.user_id, user.id), isNull(alerts.fired_at), lte(alerts.fire_at, now)))
      .returning();
    if (claimed.length === 0) return { due: [], missed: [] };

    const eventIds = claimed.flatMap((alert) => (alert.event_id ? [alert.event_id] : []));
    const taskIds = claimed.flatMap((alert) => (alert.task_id ? [alert.task_id] : []));
    const [eventRows, taskRows] = await Promise.all([
      eventIds.length === 0
        ? []
        : tx.select().from(events).where(and(inArray(events.id, eventIds), eq(events.user_id, user.id))),
      taskIds.length === 0
        ? []
        : tx.select().from(tasks).where(and(inArray(tasks.id, taskIds), eq(tasks.user_id, user.id))),
    ]);
    const eventTitles = new Map(eventRows.map((row) => [row.id, row.title]));
    const taskTitles = new Map(taskRows.map((row) => [row.id, row.title]));

    const result: AlertClaim = { due: [], missed: [] };
    for (const alert of [...claimed].sort((a, b) => a.fire_at.getTime() - b.fire_at.getTime())) {
      const kind = alert.event_id ? "event" : "task";
      const itemId = alert.event_id ?? alert.task_id;
      const title = (alert.event_id ? eventTitles : taskTitles).get(itemId ?? "");
      if (itemId === null || title === undefined) continue;
      const entry: ClaimedAlert = {
        id: alert.id,
        kind,
        item_id: itemId,
        title,
        offset_minutes: alert.offset_minutes,
        fire_at: alert.fire_at.toISOString(),
      };
      (isMissed(alert.fire_at, now) ? result.missed : result.due).push(entry);
    }
    return result;
  }));

  return ok(claim);
});
