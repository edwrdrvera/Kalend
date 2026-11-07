import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { ensureDOM, renderHook } from "@/test-utils/render-hook";

const ENDPOINT = "https://push.example.com/subscription/device-1";
const KEY = "AQAB";
const originalFetch = globalThis.fetch;

let permission: NotificationPermission;
let requestPermission: ReturnType<typeof mock>;
let subscription: {
  endpoint: string;
  unsubscribe: ReturnType<typeof mock>;
  toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } };
} | null;
let getSubscription: ReturnType<typeof mock>;
let subscribe: ReturnType<typeof mock>;
let register: ReturnType<typeof mock>;
let getRegistration: ReturnType<typeof mock>;
let fetchMock: ReturnType<typeof mock>;

function installBrowser() {
  ensureDOM();
  permission = "default";
  requestPermission = mock(async () => {
    permission = "granted";
    return permission;
  });
  subscription = null;
  getSubscription = mock(async () => subscription);
  subscribe = mock(async () => {
    subscription = {
      endpoint: ENDPOINT,
      unsubscribe: mock(async () => true),
      toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
    };
    return subscription;
  });
  const registration = { pushManager: { getSubscription, subscribe } };
  register = mock(async () => registration);
  getRegistration = mock(async () => (subscription ? registration : undefined));
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: {
      get permission() { return permission; },
      requestPermission,
    },
  });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register, getRegistration },
  });
  fetchMock = mock(async () => new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = KEY;
}

beforeEach(installBrowser);

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (window as unknown as Record<string, unknown>).Notification;
  delete (window as unknown as Record<string, unknown>).PushManager;
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
});

import { useClosedAlerts } from "../useClosedAlerts";

const calls = (method: string) =>
  fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === method);

describe("useClosedAlerts", () => {
  it("says the browser can't do it, and does not ask, when push is missing", async () => {
    delete (window as unknown as Record<string, unknown>).PushManager;
    const { result, act, unmount } = renderHook(() => useClosedAlerts());
    await act(() => {});
    expect(result.current.status).toBe("unsupported");
    expect(result.current.message).toBe("This browser can't show alerts when Kalend is closed.");
    await act(() => result.current.enable());
    expect(register).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    unmount();
  });

  it("says the server is not set up when the public key is missing", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const { result, act, unmount } = renderHook(() => useClosedAlerts());
    await act(() => {});
    expect(result.current.status).toBe("unconfigured");
    expect(result.current.message).toBe("Alerts when Kalend is closed aren't set up on this server.");
    expect(register).not.toHaveBeenCalled();
    unmount();
  });

  it("explains a blocked permission without asking again", async () => {
    permission = "denied";
    const { result, act, unmount } = renderHook(() => useClosedAlerts());
    await act(() => {});
    expect(result.current.status).toBe("denied");
    expect(result.current.message).toBe("Notifications are blocked, so alerts can't arrive when Kalend is closed.");
    expect(requestPermission).not.toHaveBeenCalled();
    unmount();
  });

  it("asks, subscribes, and saves the device when turned on", async () => {
    const { result, act, unmount } = renderHook(() => useClosedAlerts());
    await act(() => {});
    expect(result.current.status).toBe("off");
    await act(() => result.current.enable());
    expect(requestPermission).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(subscribe.mock.calls[0][0].userVisibleOnly).toBe(true);
    expect(calls("POST")).toHaveLength(1);
    expect(calls("POST")[0][0]).toBe("/api/push/subscriptions");
    expect(JSON.parse(String((calls("POST")[0][1] as RequestInit).body))).toEqual({
      endpoint: ENDPOINT,
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    });
    expect(result.current.status).toBe("on");
    expect(result.current.message).toBeNull();
    unmount();
  });

  it("unsubscribes and removes the device when turned off", async () => {
    const { result, act, unmount } = renderHook(() => useClosedAlerts());
    await act(() => {});
    await act(() => result.current.enable());
    getRegistration.mockImplementation(async () => ({ pushManager: { getSubscription, subscribe } }));
    await act(() => result.current.disable());
    expect(subscription?.unsubscribe).toHaveBeenCalled();
    expect(calls("DELETE")).toHaveLength(1);
    expect(JSON.parse(String((calls("DELETE")[0][1] as RequestInit).body))).toEqual({ endpoint: ENDPOINT });
    expect(result.current.status).toBe("off");
    unmount();
  });

  it("stays on when the device was already subscribed", async () => {
    subscription = {
      endpoint: ENDPOINT,
      unsubscribe: mock(async () => true),
      toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
    };
    getRegistration.mockImplementation(async () => ({ pushManager: { getSubscription, subscribe } }));
    const { result, act, unmount } = renderHook(() => useClosedAlerts());
    await act(() => {});
    expect(result.current.status).toBe("on");
    unmount();
  });
});
