import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from "bun:test";
import { setupMockDb, type MockAuthUser, type MockDbState } from "@/test-utils/mock-db";
import type { PushSendResult, PushTarget } from "@/lib/api/send-push";

interface MockAlert {
  id: string;
  user_id: string;
  event_id: string | null;
  task_id: string | null;
  offset_minutes: number;
  fire_at: Date;
  fired_at: Date | null;
}
interface MockItem {
  id: string;
  user_id: string;
  title: string;
}
interface MockSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const ME = "user-uuid-123";
const OTHER = "other-user-456";
const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EVENT_ID = "11111111-1111-4111-8111-222222222222";
const TASK_ID = "33333333-3333-4333-8333-111111111111";
const NOW = new Date("2026-08-10T10:00:00Z");
const SECRET = "test-push-secret";
const MINE = "https://push.example.com/device/mine";
const MINE_OTHER = "https://push.example.com/device/mine-2";
const THEIRS = "https://push.example.com/device/theirs";
const minutesFromNow = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };
const sendPushMock = mock(async (_target: PushTarget): Promise<PushSendResult> => ({ ok: true }));

mock.module("@/lib/api/send-push", () => ({
  sendPush: (target: PushTarget) => sendPushMock(target),
}));

const alertState: MockDbState<MockAlert> = { rows: [], shouldFail: false, evaluateWhere: true };
const eventState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };
const taskState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };
const subscriptionState: MockDbState<MockSubscription> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("alert-", alertState, () => mockCurrentUser, {}, false, () => [], {
  events: eventState,
  tasks: taskState,
  push_subscriptions: subscriptionState,
});

import { POST as claimAlerts } from "../../claim/route";
import { DELETE as removeSubscription } from "../../../push/subscriptions/route";
import { POST as pushDue } from "../route";

const envKeys = ["ALERT_PUSH_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

const alertRow = (id: string, over: Partial<MockAlert> = {}): MockAlert => ({
  id,
  user_id: ME,
  event_id: EVENT_ID,
  task_id: null,
  offset_minutes: 5,
  fire_at: minutesFromNow(0),
  fired_at: null,
  ...over,
});

const device = (id: string, userId: string, endpoint: string): MockSubscription => ({
  id,
  user_id: userId,
  endpoint,
  p256dh: `${id}-p256dh`,
  auth: `${id}-auth`,
});

const push = (authorization?: string) =>
  pushDue(new Request("http://localhost/api/alerts/push-due", {
    method: "POST",
    headers: authorization === undefined ? {} : { authorization },
  }));

const firedAt = (id: string) => alertState.rows.find((row) => row.id === id)?.fired_at ?? null;

function pushed(): { endpoint: string; alert: { id: string; kind: string; itemId: string; message: string } }[] {
  return sendPushMock.mock.calls.map((call) => {
    const target = call[0] as PushTarget;
    return { endpoint: target.endpoint, alert: JSON.parse(target.payload) as { id: string; kind: string; itemId: string; message: string } };
  });
}

describe("POST /api/alerts/push-due", () => {
  beforeEach(() => {
    setSystemTime(NOW);
    mockCurrentUser = { id: ME, email: "student@university.edu" };
    process.env.ALERT_PUSH_SECRET = SECRET;
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:alerts@example.com";
    sendPushMock.mockReset();
    sendPushMock.mockImplementation(async () => ({ ok: true }));
    eventState.rows = [
      { id: EVENT_ID, user_id: ME, title: "CS 101 Lecture" },
      { id: OTHER_EVENT_ID, user_id: OTHER, title: "Private seminar" },
    ];
    taskState.rows = [{ id: TASK_ID, user_id: ME, title: "Essay" }];
    alertState.rows = [];
    subscriptionState.rows = [device("sub-mine", ME, MINE)];
    alertState.shouldFail = false;
    eventState.shouldFail = false;
  });

  afterEach(() => {
    setSystemTime();
    for (const key of envKeys) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("returns 503 when the secret is unset and does not fire alerts", async () => {
    delete process.env.ALERT_PUSH_SECRET;
    alertState.rows = [alertRow("a-due")];
    expect((await push(`Bearer ${SECRET}`)).status).toBe(503);
    expect(sendPushMock).not.toHaveBeenCalled();
    expect(firedAt("a-due")).toBeNull();
  });

  it("returns 401 for a missing or wrong secret and does not fire alerts", async () => {
    alertState.rows = [alertRow("a-due")];
    expect((await push()).status).toBe(401);
    expect((await push("Bearer wrong-secret")).status).toBe(401);
    expect(sendPushMock).not.toHaveBeenCalled();
    expect(firedAt("a-due")).toBeNull();
  });

  it("returns 503 when the push keys are unset and does not fire alerts", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    alertState.rows = [alertRow("a-due")];
    expect((await push(`Bearer ${SECRET}`)).status).toBe(503);
    expect(sendPushMock).not.toHaveBeenCalled();
    expect(firedAt("a-due")).toBeNull();
  });

  it("pushes an alert that is due five minutes before the event, and not a future one", async () => {
    alertState.rows = [
      alertRow("a-five", { offset_minutes: 5, fire_at: minutesFromNow(0) }),
      alertRow("a-later", { offset_minutes: 15, fire_at: minutesFromNow(10) }),
    ];
    const response = await push(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { sent: 1 } });
    expect(pushed()).toEqual([
      {
        endpoint: MINE,
        alert: expect.objectContaining({
          id: "a-five",
          kind: "event",
          itemId: EVENT_ID,
          message: "CS 101 Lecture starts in 5 min",
        }),
      },
    ]);
    expect(firedAt("a-five")?.toISOString()).toBe(NOW.toISOString());
    expect(firedAt("a-later")).toBeNull();
  });

  it("sends one alert to each of the user's devices", async () => {
    subscriptionState.rows = [device("sub-1", ME, MINE), device("sub-2", ME, MINE_OTHER)];
    alertState.rows = [alertRow("a-due")];
    await push(`Bearer ${SECRET}`);
    expect(pushed().map((item) => item.endpoint).sort()).toEqual([MINE, MINE_OTHER].sort());
    expect(pushed().map((item) => item.alert.id)).toEqual(["a-due", "a-due"]);
    expect(firedAt("a-due")).not.toBeNull();
  });

  it("delivers each alert once whether the open tab or the push check claims it first", async () => {
    alertState.rows = [alertRow("a-due")];
    const [claimResponse, pushResponse] = await Promise.all([
      claimAlerts(new Request("http://localhost/api/alerts/claim", { method: "POST" })),
      push(`Bearer ${SECRET}`),
    ]);
    expect(claimResponse.status).toBe(200);
    expect(pushResponse.status).toBe(200);
    const claimJson = await claimResponse.json();
    const claimed = [...claimJson.data.due, ...claimJson.data.missed].map((alert: { id: string }) => alert.id);
    const sent = pushed().map((item) => item.alert.id);
    expect([...claimed, ...sent]).toEqual(["a-due"]);

    sendPushMock.mockClear();
    const again = await push(`Bearer ${SECRET}`);
    const claimAgain = await (await claimAlerts(new Request("http://localhost/api/alerts/claim", { method: "POST" }))).json();
    expect(await again.json()).toEqual({ success: true, data: { sent: 0 } });
    expect(claimAgain.data).toEqual({ due: [], missed: [] });
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("does not push a missed alert", async () => {
    alertState.rows = [alertRow("a-late", { offset_minutes: 60, fire_at: minutesFromNow(-6) })];
    const response = await push(`Bearer ${SECRET}`);
    expect(await response.json()).toEqual({ success: true, data: { sent: 0 } });
    expect(sendPushMock).not.toHaveBeenCalled();
    expect(firedAt("a-late")).not.toBeNull();
  });

  it("sends nothing and leaves the alert unfired when the device is turned off", async () => {
    alertState.rows = [alertRow("a-due")];
    const removed = await removeSubscription(new Request("http://localhost/api/push/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: MINE }),
    }));
    expect(await removed.json()).toEqual({ success: true, data: { removed: true } });
    const response = await push(`Bearer ${SECRET}`);
    expect(await response.json()).toEqual({ success: true, data: { sent: 0 } });
    expect(sendPushMock).not.toHaveBeenCalled();
    expect(firedAt("a-due")).toBeNull();
  });

  it("never sends one user's alert to another user's device", async () => {
    subscriptionState.rows = [device("sub-mine", ME, MINE), device("sub-theirs", OTHER, THEIRS)];
    alertState.rows = [
      alertRow("a-mine"),
      alertRow("a-theirs", { user_id: OTHER, event_id: OTHER_EVENT_ID, fire_at: minutesFromNow(-1) }),
    ];
    await push(`Bearer ${SECRET}`);
    const byEndpoint = new Map(pushed().map((item) => [item.endpoint, item.alert]));
    expect(byEndpoint.get(MINE)).toMatchObject({ id: "a-mine", itemId: EVENT_ID });
    expect(byEndpoint.get(THEIRS)).toMatchObject({ id: "a-theirs", itemId: OTHER_EVENT_ID, message: "Private seminar starts in 5 min" });
    expect(pushed().some((item) => item.endpoint === MINE && item.alert.id === "a-theirs")).toBe(false);
    expect(pushed().some((item) => item.endpoint === THEIRS && item.alert.id === "a-mine")).toBe(false);
  });

  it("drops a device the push service no longer knows", async () => {
    subscriptionState.rows = [device("sub-1", ME, MINE), device("sub-gone", ME, "https://push.example.com/device/gone")];
    alertState.rows = [alertRow("a-due")];
    sendPushMock.mockImplementation(async (target) =>
      target.endpoint.endsWith("/gone") ? { ok: false, gone: true } : { ok: true }
    );
    await push(`Bearer ${SECRET}`);
    expect(subscriptionState.rows.map((row) => row.id)).toEqual(["sub-1"]);
    expect(pushed().some((item) => item.endpoint === MINE)).toBe(true);
  });

  it("keeps the alert fired when a send fails for another reason", async () => {
    alertState.rows = [alertRow("a-due")];
    sendPushMock.mockImplementation(async () => ({ ok: false, gone: false, status: 500 }));
    await push(`Bearer ${SECRET}`);
    expect(subscriptionState.rows).toHaveLength(1);
    expect(firedAt("a-due")).not.toBeNull();
  });
});
