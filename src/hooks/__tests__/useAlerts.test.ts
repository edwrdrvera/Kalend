import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarAlert } from "@/lib/calendar-types";

const { useAlerts } = await import("../useAlerts");

const originalFetch = globalThis.fetch;
const originalNotification = (globalThis as Record<string, unknown>).Notification;

let server: CalendarAlert[];
let requests: string[];
let failDeletes: number;

const stored = (id: string, offset: AlertOffset): CalendarAlert => ({
  id,
  event_id: "e1",
  task_id: null,
  offset_minutes: offset,
  fire_at: "2026-10-02T12:00:00.000Z",
  fired_at: null,
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const offsets = () => server.map((alert) => alert.offset_minutes).sort((a, b) => a - b);

beforeEach(() => {
  requests = [];
  failDeletes = 0;
  (globalThis as Record<string, unknown>).Notification = { permission: "granted" };
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push(`${method} ${url}`);
    if (method === "GET") return json({ success: true, data: server });
    if (method === "POST") {
      const body = JSON.parse(String(init?.body));
      const created = stored(`new-${body.offset_minutes}`, body.offset_minutes);
      server = [...server, created];
      return json({ success: true, data: created }, 201);
    }
    if (failDeletes > 0) {
      failDeletes--;
      return json({ success: false, error: "down" }, 500);
    }
    server = server.filter((alert) => `/api/alerts/${alert.id}` !== url);
    return json({ success: true });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as Record<string, unknown>).Notification = originalNotification;
});

async function mountLoaded() {
  const hook = renderHook(() => useAlerts(() => {}));
  await hook.act(() => {});
  return hook;
}

const EVENT = { kind: "event", id: "e1" } as const;

describe("useAlerts syncAlert", () => {
  it("retrying a switch to a smaller offset deletes the old alert after its delete failed", async () => {
    server = [stored("old-15", 15)];
    const { result, act } = await mountLoaded();

    failDeletes = 1;
    await act(async () => {
      await expect(result.current.syncAlert(EVENT, 5)).rejects.toThrow();
    });
    expect(offsets()).toEqual([5, 15]);

    await act(() => result.current.syncAlert(EVENT, 5));
    expect(offsets()).toEqual([5]);
  });

  it("collapses several stored alerts to the one wanted", async () => {
    server = [stored("a", 5), stored("b", 15), stored("c", 60)];
    const { result, act } = await mountLoaded();

    await act(() => result.current.syncAlert(EVENT, 15));
    expect(offsets()).toEqual([15]);
  });

  it("clears every stored alert when none is wanted", async () => {
    server = [stored("a", 5), stored("b", 15)];
    const { result, act } = await mountLoaded();

    await act(() => result.current.syncAlert(EVENT, null));
    expect(offsets()).toEqual([]);
  });

  it("collapses several stored alerts even when the wanted one is the smallest", async () => {
    server = [stored("a", 5), stored("b", 15)];
    const { result, act } = await mountLoaded();

    await act(() => result.current.syncAlert(EVENT, 5));
    expect(offsets()).toEqual([5]);
  });

  it("sends nothing when the item already has exactly the wanted alert", async () => {
    server = [stored("a", 15)];
    const { result, act } = await mountLoaded();
    requests = [];

    await act(() => result.current.syncAlert(EVENT, 15));
    expect(requests).toEqual([]);
  });
});
