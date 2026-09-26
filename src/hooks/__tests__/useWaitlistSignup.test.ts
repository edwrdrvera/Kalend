import { afterEach, describe, expect, it, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import { useWaitlistSignup } from "@/hooks/useWaitlistSignup";

const originalFetch = globalThis.fetch;

function stubFetch(respond: () => Promise<Response>) {
  const fetchMock = mock(respond);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const json = (body: unknown, status: number) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

async function joinWith(respond: () => Promise<Response>) {
  const fetchMock = stubFetch(respond);
  const hook = renderHook(() => useWaitlistSignup());
  await hook.act(() => {});
  await hook.act(() => hook.result.current.join("a@b.co", ""));
  hook.unmount();
  return { state: hook.result.current, fetchMock };
}

describe("useWaitlistSignup", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("posts the email and honeypot and ends in done", async () => {
    const { state, fetchMock } = await joinWith(() => json({ success: true, data: {} }, 201));

    expect(state.status).toBe("done");
    expect(state.error).toBeNull();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/waitlist");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@b.co", website: "" });
  });

  it("shows the rate-limit message on 429", async () => {
    const { state } = await joinWith(() => json({ success: false, error: "slow down" }, 429));

    expect(state.status).toBe("error");
    expect(state.error).toBe("Too many attempts. Please wait 10 minutes and try again.");
  });

  it("shows the server's error message", async () => {
    const { state } = await joinWith(() =>
      json({ success: false, error: "A valid email address is required" }, 400)
    );

    expect(state.status).toBe("error");
    expect(state.error).toBe("A valid email address is required");
  });

  it("shows a generic message when the network fails", async () => {
    const { state } = await joinWith(() => Promise.reject(new TypeError("offline")));

    expect(state.status).toBe("error");
    expect(state.error).toBe("Something went wrong. Please try again.");
  });
});
