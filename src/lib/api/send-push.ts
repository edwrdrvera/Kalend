import { sendNotification, setVapidDetails, WebPushError } from "web-push";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: string;
}

export type PushSendResult =
  | { ok: true }
  | { ok: false; gone: true }
  | { ok: false; gone: false; status: number | null };

// The browser and the sender share this one public key. A second variable
// would let them drift, and a subscription made with one key cannot be sent
// with the other.
function vapid(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/**
 * Sends one alert to one device. A 404 or 410 means the device is gone.
 * `timeoutMs` closes a hung socket. The caller keeps a shorter timer and
 * treats that shorter timer as the only limit on the send.
 */
export async function sendPush(target: PushTarget, timeoutMs: number): Promise<PushSendResult> {
  const keys = vapid();
  if (!keys) return { ok: false, gone: false, status: null };
  setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  try {
    await sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      target.payload,
      { timeout: timeoutMs },
    );
    return { ok: true };
  } catch (error) {
    const status = error instanceof WebPushError ? error.statusCode : null;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, gone: false, status };
  }
}
