import { afterAll, describe, expect, it, mock } from "bun:test";
import postgres from "postgres";

// Loaded only by `bun test` on this file, from a child process. The name is
// not a test file the suite discovers, so its mock cannot replace the sender
// the other files use. The mock has to be installed before the sender loads.
const sent: string[] = [];
mock.module("@/lib/api/send-push", () => ({
  sendPush: async (target: { payload: string }) => {
    const body = JSON.parse(target.payload) as { id?: unknown };
    if (typeof body.id === "string") sent.push(body.id);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ok: true };
  },
}));

const { pushDueAlerts } = await import("@/lib/api/push-due");
const { db } = await import("@/db");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const sql = postgres(url, { prepare: false, onnotice: () => {} });

afterAll(async () => {
  await sql.end();
  await db.$client.end({ timeout: 1 });
});

function count(id: string): number {
  return sent.filter((value) => value === id).length;
}

describe("overlapping push checks", () => {
  it("sends each alert once", async () => {
    const userId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const dueId = crypto.randomUUID();
    const staleId = crypto.randomUUID();
    try {
      await sql`
        insert into events (id, user_id, title, start_at, end_at)
        values (${eventId}, ${userId}, 'Race', now(), now() + interval '1 hour')
      `;
      await sql`
        insert into alerts (id, user_id, event_id, offset_minutes, fire_at, fired_at)
        values
          (${dueId}, ${userId}, ${eventId}, 5, now(), null),
          (${staleId}, ${userId}, ${eventId}, 15, now(), now() + interval '30 seconds')
      `;
      await sql`
        insert into push_subscriptions (user_id, endpoint, p256dh, auth)
        values (${userId}, ${"https://push.example.test/" + userId}, 'p256dh-key', 'auth-key')
      `;

      await Promise.all([pushDueAlerts(), pushDueAlerts()]);

      expect(count(dueId)).toBe(1);
      expect(count(staleId)).toBe(1);
    } finally {
      await sql`delete from alerts where user_id = ${userId}`;
      await sql`delete from push_subscriptions where user_id = ${userId}`;
      await sql`delete from events where user_id = ${userId}`;
    }
  }, 15_000);
});
