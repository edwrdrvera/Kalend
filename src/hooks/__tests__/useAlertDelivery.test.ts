import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import type { AlertClaim, ClaimedAlert } from "@/lib/calendar-types";

const LECTURE: ClaimedAlert = {
  id: "a1",
  kind: "event",
  item_id: "e1",
  title: "CS 101 Lecture",
  offset_minutes: 15,
  fire_at: "2026-08-10T09:45:00Z",
};
const ESSAY: ClaimedAlert = {
  id: "a2",
  kind: "task",
  item_id: "t1",
  title: "Essay",
  offset_minutes: 0,
  fire_at: "2026-08-09T22:00:00Z",
};

// ── Browser stubs ──────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
let fetchMock: ReturnType<typeof mock>;
let claim: AlertClaim;
let claimFails: boolean;
let intervals: { tick: () => void; ms: number; cleared: boolean }[];

class FakeNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = mock(async () => "granted" as NotificationPermission);
  static shown: FakeNotification[] = [];
  onclick: (() => void) | null = null;
  closed = false;
  constructor(public title: string, public options?: NotificationOptions) {
    FakeNotification.shown.push(this);
  }
  close() {
    this.closed = true;
  }
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  const WindowEvent = (window as unknown as { Event: typeof Event }).Event;
  document.dispatchEvent(new WindowEvent("visibilitychange"));
}

beforeEach(() => {
  claim = { due: [], missed: [] };
  claimFails = false;
  intervals = [];
  FakeNotification.permission = "granted";
  FakeNotification.shown = [];
  FakeNotification.requestPermission.mockClear();
  fetchMock = mock(async () =>
    claimFails
      ? new Response(JSON.stringify({ success: false, error: "down" }), { status: 500 })
      : new Response(JSON.stringify({ success: true, data: claim }), { status: 200 })
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  (globalThis as Record<string, unknown>).Notification = FakeNotification;
  globalThis.setInterval = ((tick: () => void, ms: number) => {
    intervals.push({ tick, ms, cleared: false });
    return intervals.length;
  }) as unknown as typeof setInterval;
  globalThis.clearInterval = ((id: number) => {
    intervals[id - 1].cleared = true;
  }) as unknown as typeof clearInterval;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
  delete (globalThis as Record<string, unknown>).Notification;
});

import { ALERT_POLL_MS, useAlertDelivery } from "../useAlertDelivery";

const mount = (onOpen: (kind: string, id: string) => void = () => {}) =>
  renderHook(() => useAlertDelivery(onOpen));
const claimCalls = () => fetchMock.mock.calls.filter(([url]) => url === "/api/alerts/claim");

describe("useAlertDelivery", () => {
  it("checks for due alerts when it mounts", async () => {
    claim = { due: [LECTURE], missed: [] };
    const { result, act, unmount } = mount();
    await act(() => {});

    expect(claimCalls()).toHaveLength(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(result.current.tray.due.map((m) => m.text)).toEqual(["CS 101 Lecture starts in 15 min"]);
    unmount();
  });

  it("checks again every 30 seconds", async () => {
    const { act, unmount } = mount();
    await act(() => {});
    expect(intervals.map((i) => i.ms)).toEqual([ALERT_POLL_MS]);
    expect(ALERT_POLL_MS).toBe(30_000);

    await act(() => intervals[0].tick());
    expect(claimCalls()).toHaveLength(2);
    unmount();
  });

  it("checks when the tab becomes visible, not when it is hidden", async () => {
    const { act, unmount } = mount();
    await act(() => {});
    expect(claimCalls()).toHaveLength(1);

    await act(() => setVisibility("hidden"));
    expect(claimCalls()).toHaveLength(1);

    await act(() => setVisibility("visible"));
    expect(claimCalls()).toHaveLength(2);
    unmount();
  });

  it("stops checking after unmount", async () => {
    const { act, unmount } = mount();
    await act(() => {});
    unmount();
    expect(intervals[0].cleared).toBe(true);

    await act(() => setVisibility("visible"));
    expect(claimCalls()).toHaveLength(1);
  });

  it("shows a browser notification for a due alert when permission is granted", async () => {
    claim = { due: [LECTURE], missed: [] };
    const { result, act, unmount } = mount();
    await act(() => {});

    expect(FakeNotification.shown.map((n) => n.title)).toEqual(["CS 101 Lecture starts in 15 min"]);
    expect(result.current.tray.due).toHaveLength(1);
    unmount();
  });

  it.each(["denied", "default"] as const)(
    "still shows the in-app message and no notification when permission is %s",
    async (permission) => {
      FakeNotification.permission = permission;
      claim = { due: [LECTURE], missed: [] };
      const { result, act, unmount } = mount();
      await act(() => {});

      expect(FakeNotification.shown).toHaveLength(0);
      expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
      expect(result.current.tray.due).toHaveLength(1);
      unmount();
    }
  );

  it("works when the browser has no Notification support", async () => {
    delete (globalThis as Record<string, unknown>).Notification;
    claim = { due: [LECTURE], missed: [] };
    const { result, act, unmount } = mount();
    await act(() => {});

    expect(result.current.tray.due).toHaveLength(1);
    unmount();
  });

  it("lists missed alerts without notifying", async () => {
    claim = { due: [], missed: [ESSAY] };
    const { result, act, unmount } = mount();
    await act(() => {});

    expect(FakeNotification.shown).toHaveLength(0);
    expect(result.current.tray.due).toEqual([]);
    expect(result.current.tray.missed.map((m) => m.id)).toEqual(["a2"]);
    unmount();
  });

  it("opens the item through the latest handler when a notification is clicked", async () => {
    claim = { due: [LECTURE], missed: [] };
    const first = mock<(kind: string, id: string) => void>();
    const latest = mock<(kind: string, id: string) => void>();
    let onOpen = first;
    const { result, act, unmount } = renderHook(() => useAlertDelivery(onOpen));
    await act(() => {});

    onOpen = latest;
    await act(() => result.current.dismiss("unrelated")); // a re-render hands the hook the newer handler
    await act(() => {
      FakeNotification.shown[0].onclick?.();
    });

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith("event", "e1");
    expect(FakeNotification.shown[0].closed).toBe(true);
    expect(result.current.tray.due).toEqual([]);
    unmount();
  });

  it("does not show an alert twice if it comes back again", async () => {
    claim = { due: [LECTURE], missed: [] };
    const { result, act, unmount } = mount();
    await act(() => {});
    await act(() => intervals[0].tick());

    expect(result.current.tray.due).toHaveLength(1);
    unmount();
  });

  it("keeps working after a failed check", async () => {
    claimFails = true;
    const { result, act, unmount } = mount();
    await act(() => {});
    expect(result.current.tray.due).toEqual([]);

    claimFails = false;
    claim = { due: [LECTURE], missed: [] };
    await act(() => intervals[0].tick());
    expect(result.current.tray.due).toHaveLength(1);
    unmount();
  });

  it("dismisses one message and clears the missed list", async () => {
    claim = { due: [LECTURE], missed: [ESSAY] };
    const { result, act, unmount } = mount();
    await act(() => {});

    await act(() => result.current.dismiss("a1"));
    expect(result.current.tray.due).toEqual([]);
    expect(result.current.tray.missed).toHaveLength(1);

    await act(() => result.current.clearMissed());
    expect(result.current.tray.missed).toEqual([]);
    unmount();
  });
});
