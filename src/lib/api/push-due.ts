import { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { claimDueAlerts, unfinishedPushAlerts } from "@/lib/api/alert-claim";
import { sendPush, type PushSendResult, type PushTarget } from "@/lib/api/send-push";
import { MISSED_AFTER_MS } from "@/lib/alerts";
import { pushAlertFromClaim } from "@/lib/push-alert";
import type { ClaimedAlert } from "@/lib/calendar-types";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";
import { and, eq, inArray } from "drizzle-orm";

/**
 * An owner id read from our own subscription table. The brand is what the
 * owner-filter check requires. This must not be handed an id from a request.
 */
function storedUser(id: string): AuthenticatedUser {
  return { id } as AuthenticatedUser;
}

// One stuck send holds its slot until the timeout. Several users run at once
// so that slot does not line everyone else up behind it. The cap keeps a
// long owner list from opening every push at the same moment.
export const PUSH_USER_CONCURRENCY = 8;

/** How long one device send may take before this check moves on. */
export const PUSH_SEND_TIMEOUT_MS = 10_000;

// How long a taken alert stays visibly unfinished. The next check retries it
// until this lease expires, which matches the five minutes a push is still
// worth sending.
const PUSH_LEASE_MS = MISSED_AFTER_MS;

/**
 * Claims each subscribed user's alerts that are still on time and pushes them
 * to that user's devices. An alert that is already late stays unclaimed so
 * the open tab can list it. If no device accepts an alert, the claim is
 * released. A partial success stays claimed so a device that already showed
 * it does not get a second copy.
 */
export async function pushDueAlerts(options?: { sendTimeoutMs?: number }): Promise<{ sent: number }> {
  const sendTimeoutMs = options?.sendTimeoutMs ?? PUSH_SEND_TIMEOUT_MS;
  const owners = await db
    .selectDistinct({ user_id: pushSubscriptions.user_id })
    .from(pushSubscriptions);
  const userIds = [...new Set(owners.map((row) => row.user_id))];
  if (userIds.length === 0) return { sent: 0 };
  let cursor = 0;
  const totals = await Promise.all(
    Array.from({ length: Math.min(PUSH_USER_CONCURRENCY, userIds.length) }, async () => {
      let sent = 0;
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= userIds.length) return sent;
        sent += await deliverTo(storedUser(userIds[index]), sendTimeoutMs);
      }
    }),
  );
  return { sent: totals.reduce((sum, count) => sum + count, 0) };
}

async function deliverTo(user: AuthenticatedUser, sendTimeoutMs: number): Promise<number> {
  const now = new Date();
  const earliestFireAt = new Date(now.getTime() - MISSED_AFTER_MS);
  // A lease still in the future, but old enough that the run which took it
  // has had its send timeout. A lease written a moment ago is left alone.
  const unfinished = await unfinishedPushAlerts(
    user,
    now,
    new Date(now.getTime() + PUSH_LEASE_MS - sendTimeoutMs),
  );
  const claim = await claimDueAlerts(user, now, {
    earliestFireAt,
    firedAt: new Date(now.getTime() + PUSH_LEASE_MS),
  });
  const due = [...unfinished.due, ...claim.due];
  if (due.length === 0) {
    if (unfinished.releaseIds.length > 0) await releaseClaim(user, unfinished.releaseIds);
    return 0;
  }
  const devices = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.user_id, user.id));
  const outcomes = await Promise.all(due.map((alert) => deliverAlert(user, alert, devices, sendTimeoutMs)));
  const delivered = outcomes.filter((outcome) => outcome.sent > 0).map((outcome) => outcome.id);
  const undelivered = outcomes.filter((outcome) => outcome.sent === 0).map((outcome) => outcome.id);
  if (delivered.length > 0) await confirmClaim(user, delivered, now);
  const releaseIds = [...undelivered, ...unfinished.releaseIds];
  if (releaseIds.length > 0) await releaseClaim(user, releaseIds);
  return outcomes.reduce((sum, outcome) => sum + outcome.sent, 0);
}

async function deliverAlert(
  user: AuthenticatedUser,
  alert: ClaimedAlert,
  devices: { endpoint: string; p256dh: string; auth: string }[],
  sendTimeoutMs: number,
): Promise<{ id: string; sent: number }> {
  const payload = JSON.stringify(pushAlertFromClaim(alert));
  const results = await Promise.all(devices.map((device) => sendToDevice(user, device, payload, sendTimeoutMs)));
  return { id: alert.id, sent: results.filter((result) => result.ok).length };
}

async function sendToDevice(
  user: AuthenticatedUser,
  device: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  sendTimeoutMs: number,
): Promise<PushSendResult> {
  const result = await sendWithin(sendTimeoutMs, {
    endpoint: device.endpoint,
    p256dh: device.p256dh,
    auth: device.auth,
    payload,
  });
  if (result.ok) return result;
  if (result.gone) {
    await db
      .delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.endpoint, device.endpoint),
        eq(pushSubscriptions.user_id, user.id),
      ))
      .returning();
    return result;
  }
  console.error("Alert push failed", result.status);
  return result;
}

// Success closes the lease. The stored time is the check's clock, so the
// next run does not treat the alert as unfinished.
async function confirmClaim(user: AuthenticatedUser, alertIds: string[], now: Date): Promise<void> {
  await db
    .update(alerts)
    .set({ fired_at: now })
    .where(and(eq(alerts.user_id, user.id), inArray(alerts.id, alertIds)))
    .returning();
}

// The claim is committed before the push service answers. Clearing fired_at
// puts the alert back for the next check and for an open tab.
async function releaseClaim(user: AuthenticatedUser, alertIds: string[]): Promise<void> {
  await db
    .update(alerts)
    .set({ fired_at: null })
    .where(and(eq(alerts.user_id, user.id), inArray(alerts.id, alertIds)))
    .returning();
}

// One clock for a stuck send. web-push is not given its own timeout, so the
// two cannot disagree about when to give up.
function sendWithin(limitMs: number, target: PushTarget): Promise<PushSendResult> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, gone: false, status: null });
    }, limitMs);
    sendPush(target).then(
      (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, gone: false, status: null });
      },
    );
  });
}
