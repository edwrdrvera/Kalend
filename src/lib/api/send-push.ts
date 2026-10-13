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

function vapid(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/** Sends one alert to one device. A 404 or 410 means the device is gone. */
export async function sendPush(target: PushTarget): Promise<PushSendResult> {
  const keys = vapid();
  if (!keys) return { ok: false, gone: false, status: null };
  setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  try {
    await sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      target.payload,
    );
    return { ok: true };
  } catch (error) {
    const status = error instanceof WebPushError ? error.statusCode : null;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, gone: false, status };
  }
}
