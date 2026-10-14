import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { parseAlertQuery } from "@/lib/alert-link";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const TASK_ID = "33333333-3333-4333-8333-111111111111";

interface Client {
  url: string;
  visibilityState: "visible" | "hidden";
  focused: boolean;
  messages: unknown[];
  focus: () => Promise<void>;
  postMessage: (message: unknown) => void;
}

interface Scope {
  clientsList: Client[];
  opened: string | null;
  shown: { title: string; options: { tag?: string; data?: { kind: string; itemId: string } } }[];
  registration: { showNotification: (title: string, options: { tag?: string; data?: { kind: string; itemId: string } }) => Promise<void> };
  clients: {
    matchAll: () => Promise<Client[]>;
    openWindow: (url: string) => Promise<{ url: string }>;
  };
  addEventListener: (type: string, fn: (event: never) => void) => void;
}

function loadWorker() {
  const listeners = new Map<string, (event: never) => void>();
  const scope: Scope = {
    clientsList: [],
    opened: null,
    shown: [],
    registration: {
      showNotification: async (title, options) => {
        scope.shown.push({ title, options });
      },
    },
    clients: {
      matchAll: async () => scope.clientsList,
      openWindow: async (url) => {
        scope.opened = url;
        return { url };
      },
    },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
  };
  const code = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
  new Function("self", code)(scope);
  return { scope, listeners };
}

function client(url: string, visibilityState: "visible" | "hidden"): Client {
  const windowClient: Client = {
    url,
    visibilityState,
    focused: false,
    messages: [],
    focus: async () => {
      windowClient.focused = true;
    },
    postMessage(message) {
      windowClient.messages.push(message);
    },
  };
  return windowClient;
}

async function fire(listeners: Map<string, (event: never) => void>, type: string, event: Record<string, unknown>) {
  let job: Promise<unknown> = Promise.resolve();
  listeners.get(type)?.({ ...event, waitUntil(promise: Promise<unknown>) { job = promise; } } as never);
  await job;
}

const pushAlert = {
  id: "alert-1",
  kind: "event",
  itemId: EVENT_ID,
  title: "CS 101 Lecture",
  message: "CS 101 Lecture starts in 5 min",
  offsetMinutes: 5,
  fireAt: "2026-08-10T10:00:00.000Z",
};

describe("service worker", () => {
  it("shows a notification when Kalend is closed, and a click opens the event", async () => {
    const { scope, listeners } = loadWorker();
    await fire(listeners, "push", { data: { json: () => pushAlert } });
    expect(scope.shown).toEqual([
      {
        title: "CS 101 Lecture starts in 5 min",
        options: { tag: "alert-1", data: { kind: "event", itemId: EVENT_ID } },
      },
    ]);

    const notification = {
      data: scope.shown[0].options.data,
      close: () => {},
    };
    await fire(listeners, "notificationclick", { notification });
    expect(parseAlertQuery(new URL(scope.opened ?? "", "https://kalend.test").searchParams.get("alert"))).toEqual({
      kind: "event",
      itemId: EVENT_ID,
    });
  });

  it("opens the task when the notification is about a task", async () => {
    const { scope, listeners } = loadWorker();
    await fire(listeners, "push", {
      data: { json: () => ({ ...pushAlert, kind: "task", itemId: TASK_ID, message: "Essay is due now" }) },
    });
    const notification = { data: scope.shown[0].options.data, close: () => {} };
    await fire(listeners, "notificationclick", { notification });
    expect(parseAlertQuery(new URL(scope.opened ?? "", "https://kalend.test").searchParams.get("alert"))).toEqual({
      kind: "task",
      itemId: TASK_ID,
    });
  });

  it("tells an open tab and does not show a second notification", async () => {
    const { scope, listeners } = loadWorker();
    const open = client("https://kalend.test/app", "visible");
    scope.clientsList = [open];
    await fire(listeners, "push", { data: { json: () => pushAlert } });
    expect(scope.shown).toHaveLength(0);
    expect(open.messages).toEqual([{ type: "kalend-alert", alert: pushAlert }]);
  });

  it("still notifies when the only open window is not the calendar", async () => {
    const { scope, listeners } = loadWorker();
    scope.clientsList = [client("https://kalend.test/", "visible")];
    await fire(listeners, "push", { data: { json: () => pushAlert } });
    expect(scope.shown).toHaveLength(1);
  });

  it("does nothing with a notification that has no alert", async () => {
    const { scope, listeners } = loadWorker();
    const hidden = client("https://kalend.test/app", "hidden");
    scope.clientsList = [hidden];
    await fire(listeners, "notificationclick", { notification: { close: () => {} } });
    await fire(listeners, "notificationclick", { notification: { data: {}, close: () => {} } });
    expect(scope.opened).toBeNull();
    expect(hidden.focused).toBe(false);
    expect(hidden.messages).toEqual([]);
  });

  it("focuses an open calendar and tells it which item to open", async () => {
    const { scope, listeners } = loadWorker();
    const hidden = client("https://kalend.test/app?day=1", "hidden");
    scope.clientsList = [hidden];
    await fire(listeners, "push", { data: { json: () => pushAlert } });
    const notification = { data: scope.shown[0].options.data, close: () => {} };
    await fire(listeners, "notificationclick", { notification });
    expect(scope.opened).toBeNull();
    expect(hidden.focused).toBe(true);
    expect(hidden.messages).toEqual([{ type: "kalend-open-alert", kind: "event", itemId: EVENT_ID }]);
  });
});
