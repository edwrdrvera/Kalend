import { and, eq } from "drizzle-orm";
import type { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { events } from "@/db/schema/events";
import { tasks } from "@/db/schema/tasks";
import { fireAtFor, type AlertTarget } from "@/lib/alerts";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Locks the caller's event or task and reads the time its alerts count back
 * from: an event's start, a task's due date (null when it has none). The lock
 * keeps a concurrent move from slipping between this read and the insert that
 * uses it.
 */
export async function lockAlertTime(
  tx: Tx,
  user: AuthenticatedUser,
  target: AlertTarget
): Promise<{ exists: false } | { exists: true; at: Date | null }> {
  if (target.kind === "event") {
    const [event] = await tx
      .select()
      .from(events)
      .where(and(eq(events.id, target.id), eq(events.user_id, user.id)))
      .for("update");
    return event ? { exists: true, at: event.start_at } : { exists: false };
  }
  const [task] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, target.id), eq(tasks.user_id, user.id)))
    .for("update");
  return task ? { exists: true, at: task.due_at } : { exists: false };
}

/**
 * Brings an item's alerts in step after its time changed. A null time (a task
 * that lost its due date) removes them. Otherwise each alert's fire time is
 * recomputed, and an alert that is moved into the future becomes eligible to
 * fire again. Run it in the same transaction as the item update.
 */
export async function rescheduleAlerts(
  tx: Tx,
  user: AuthenticatedUser,
  target: AlertTarget,
  itemTime: Date | null,
  now: Date
): Promise<void> {
  const itemColumn = target.kind === "event" ? alerts.event_id : alerts.task_id;
  if (itemTime === null) {
    await tx
      .delete(alerts)
      .where(and(eq(itemColumn, target.id), eq(alerts.user_id, user.id)))
      .returning();
    return;
  }
  const stored = await tx
    .select()
    .from(alerts)
    .where(and(eq(itemColumn, target.id), eq(alerts.user_id, user.id)));
  for (const alert of stored) {
    const fireAt = fireAtFor(itemTime, alert.offset_minutes);
    await tx
      .update(alerts)
      .set(fireAt > now ? { fire_at: fireAt, fired_at: null } : { fire_at: fireAt })
      .where(and(eq(alerts.id, alert.id), eq(alerts.user_id, user.id)))
      .returning();
  }
}
