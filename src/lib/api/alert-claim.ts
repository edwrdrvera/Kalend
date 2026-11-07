import { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { events } from "@/db/schema/events";
import { tasks } from "@/db/schema/tasks";
import { isMissed } from "@/lib/alerts";
import type { AlertClaim, ClaimedAlert } from "@/lib/calendar-types";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq, gt, gte, inArray, isNull, lte } from "drizzle-orm";

type AlertRow = {
  id: string;
  event_id: string | null;
  task_id: string | null;
  offset_minutes: ClaimedAlert["offset_minutes"];
  fire_at: Date;
};

type TitleQuery = Pick<typeof db, "select">;

/**
 * Hands this user every alert that is due and has not fired. The single
 * UPDATE marks them fired as it returns them, and Postgres re-checks the
 * `fired_at is null` condition once a competing claim releases a row, so
 * across reloads, tabs, and the push check each alert is handed out once.
 * The titles are read in the same transaction so a failure there un-claims
 * the alerts instead of losing them.
 *
 * The push check passes `firedAt` in the future. That lease means the send
 * is not confirmed yet, so a later check can send it if this one stops
 * first. The open tab leaves it unset and stores `now`.
 */
export async function claimDueAlerts(
  user: AuthenticatedUser,
  now = new Date(),
  options?: { earliestFireAt?: Date; firedAt?: Date },
): Promise<AlertClaim> {
  return retryTransaction(() => db.transaction(async (tx): Promise<AlertClaim> => {
    const claimed = await tx
      .update(alerts)
      .set({ fired_at: options?.firedAt ?? now })
      .where(and(
        eq(alerts.user_id, user.id),
        isNull(alerts.fired_at),
        lte(alerts.fire_at, now),
        options?.earliestFireAt ? gte(alerts.fire_at, options.earliestFireAt) : undefined,
      ))
      .returning();
    if (claimed.length === 0) return { due: [], missed: [] };
    const described = await describeAlerts(user, claimed, now, tx);
    return described.claim;
  }));
}

/**
 * Takes alerts this user already claimed for a push, whose send was never
 * confirmed, and whose lease is old enough that the run which took them has
 * stopped. The update matches the lease this read saw, the same way a new
 * claim matches `fired_at is null`, so a second check that read the same
 * lease changes nothing and does not send. `leaseUntil` is the lease the
 * rows hold after this check takes them.
 */
export async function unfinishedPushAlerts(
  user: AuthenticatedUser,
  now: Date,
  claimedBefore: Date,
  leaseUntil: Date,
): Promise<{ due: ClaimedAlert[]; releaseIds: string[] }> {
  return retryTransaction(() => db.transaction(async (tx) => {
    const stale = await tx
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.user_id, user.id),
        gt(alerts.fired_at, now),
        lte(alerts.fired_at, claimedBefore),
      ));
    const byLease = new Map<number, { firedAt: Date; ids: string[] }>();
    for (const row of stale) {
      if (row.fired_at === null) continue;
      const group = byLease.get(row.fired_at.getTime());
      if (group) group.ids.push(row.id);
      else byLease.set(row.fired_at.getTime(), { firedAt: row.fired_at, ids: [row.id] });
    }
    const won: AlertRow[] = [];
    for (const group of byLease.values()) {
      const updated = await tx
        .update(alerts)
        .set({ fired_at: leaseUntil })
        .where(and(
          eq(alerts.user_id, user.id),
          inArray(alerts.id, group.ids),
          eq(alerts.fired_at, group.firedAt),
        ))
        .returning();
      won.push(...updated);
    }
    if (won.length === 0) return { due: [], releaseIds: [] };
    const described = await describeAlerts(user, won, now, tx);
    return {
      due: described.claim.due,
      releaseIds: [...described.claim.missed.map((alert) => alert.id), ...described.skippedIds],
    };
  }));
}

async function describeAlerts(
  user: AuthenticatedUser,
  rows: AlertRow[],
  now: Date,
  query: TitleQuery,
): Promise<{ claim: AlertClaim; skippedIds: string[] }> {
  const eventIds = rows.flatMap((alert) => (alert.event_id ? [alert.event_id] : []));
  const taskIds = rows.flatMap((alert) => (alert.task_id ? [alert.task_id] : []));
  const [eventRows, taskRows] = await Promise.all([
    eventIds.length === 0
      ? []
      : query.select().from(events).where(and(inArray(events.id, eventIds), eq(events.user_id, user.id))),
    taskIds.length === 0
      ? []
      : query.select().from(tasks).where(and(inArray(tasks.id, taskIds), eq(tasks.user_id, user.id))),
  ]);
  const eventTitles = new Map(eventRows.map((row) => [row.id, row.title]));
  const taskTitles = new Map(taskRows.map((row) => [row.id, row.title]));
  const claim: AlertClaim = { due: [], missed: [] };
  const skippedIds: string[] = [];
  for (const alert of [...rows].sort((a, b) => a.fire_at.getTime() - b.fire_at.getTime())) {
    const kind = alert.event_id ? "event" : "task";
    const itemId = alert.event_id ?? alert.task_id;
    const title = (alert.event_id ? eventTitles : taskTitles).get(itemId ?? "");
    if (itemId === null || title === undefined) {
      skippedIds.push(alert.id);
      continue;
    }
    const entry: ClaimedAlert = {
      id: alert.id,
      kind,
      item_id: itemId,
      title,
      offset_minutes: alert.offset_minutes,
      fire_at: alert.fire_at.toISOString(),
    };
    (isMissed(alert.fire_at, now) ? claim.missed : claim.due).push(entry);
  }
  return { claim, skippedIds };
}
