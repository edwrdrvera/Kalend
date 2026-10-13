import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { claimDueAlerts } from "@/lib/api/alert-claim";
import { sendPush } from "@/lib/api/send-push";
import { storedUser } from "@/lib/api/stored-user";
import { pushAlertFromClaim } from "@/lib/push-alert";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";
import { and, eq } from "drizzle-orm";

/**
 * Claims each subscribed user's due alerts and pushes them to that user's
 * devices. Missed alerts are claimed so they cannot fire twice, and they are
 * not pushed. A send that fails for any other reason leaves the alert fired.
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
  const claim = await claimDueAlerts(user);
  if (claim.due.length === 0) return 0;
  const devices = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.user_id, user.id));
  let sent = 0;
  for (const alert of claim.due) {
    const payload = JSON.stringify(pushAlertFromClaim(alert));
    for (const device of devices) {
      const result = await sendPush({
        endpoint: device.endpoint,
        p256dh: device.p256dh,
        auth: device.auth,
        payload,
      });
      if (result.ok) {
        sent += 1;
        continue;
      }
      if (result.gone) {
        await db
          .delete(pushSubscriptions)
          .where(and(
            eq(pushSubscriptions.endpoint, device.endpoint),
            eq(pushSubscriptions.user_id, user.id),
          ))
          .returning();
        continue;
      }
      console.error("Alert push failed", result.status);
    }
  }
  return sent;
}
