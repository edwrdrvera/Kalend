import { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { claimDueAlerts } from "@/lib/api/alert-claim";
import { PUSH_SEND_TIMEOUT_MS, sendPush, type PushSendResult, type PushTarget } from "@/lib/api/send-push";
import { MISSED_AFTER_MS } from "@/lib/alerts";
import { pushAlertFromClaim } from "@/lib/push-alert";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";
import { and, eq, inArray } from "drizzle-orm";

/**
 * An owner id read from our own subscription table. The brand is what the
 * owner-filter check requires. This must not be handed an id from a request.
 */
function storedUser(id: string): AuthenticatedUser {
  return { id } as AuthenticatedUser;
}

/**
 * Claims each subscribed user's alerts that are still on time and pushes them
 * to that user's devices. An alert that is already late stays unclaimed so
 * the open tab can list it. If no device accepts an alert, the claim is
 * released. A partial success stays claimed so a device that already showed
 * it does not get a second copy.
 */
export async function pushDueAlerts(): Promise<{ sent: number }> {
  const owners = await db
    .selectDistinct({ user_id: pushSubscriptions.user_id })
    .from(pushSubscriptions);
  const userIds = [...new Set(owners.map((row) => row.user_id))];
  let sent = 0;
  for (const userId of userIds) {
    sent += await deliverTo(storedUser(userId));
  }
  return { sent };
}

async function deliverTo(user: AuthenticatedUser): Promise<number> {
  const now = new Date();
  const claim = await claimDueAlerts(user, now, {
    earliestFireAt: new Date(now.getTime() - MISSED_AFTER_MS),
  });
  if (claim.due.length === 0) return 0;
  const devices = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.user_id, user.id));
  const outcomes = await Promise.all(claim.due.map(async (alert) => {
    const payload = JSON.stringify(pushAlertFromClaim(alert));
    const results = await Promise.all(devices.map((device) => sendToDevice(user, device, payload)));
    return {
      id: alert.id,
      sent: results.filter((result) => result.ok).length,
    };
  }));
  const undelivered = outcomes.filter((outcome) => outcome.sent === 0).map((outcome) => outcome.id);
  if (undelivered.length > 0) await releaseClaim(user, undelivered);
  return outcomes.reduce((sum, outcome) => sum + outcome.sent, 0);
}

async function sendToDevice(
  user: AuthenticatedUser,
  device: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<PushSendResult> {
  const result = await sendWithin(PUSH_SEND_TIMEOUT_MS, {
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

// The claim is committed before the push service answers. Clearing fired_at
// puts the alert back for the next check and for an open tab.
async function releaseClaim(user: AuthenticatedUser, alertIds: string[]): Promise<void> {
  await db
    .update(alerts)
    .set({ fired_at: null })
    .where(and(eq(alerts.user_id, user.id), inArray(alerts.id, alertIds)))
    .returning();
}

// A stuck push service must not hold the other devices. The socket timeout
// inside sendPush aborts the request. This bound still applies when that
// request never settles.
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
