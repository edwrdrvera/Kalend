import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import type { CalendarGroup } from "@/lib/calendar-types";

const BIO: CalendarGroup = { id: "group-bio", category_id: "space-school", name: "BIO 102" };
const HIST: CalendarGroup = { id: "group-hist", category_id: "space-school", name: "HIST 201" };
const WEB: CalendarGroup = { id: "group-web", category_id: "space-work", name: "Website" };

let fetchMock: ReturnType<typeof mock>;
const originalFetch = globalThis.fetch;

function stubFetch(body: unknown, status = 200) {
  fetchMock = mock(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }))
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

beforeEach(() => stubFetch({ success: true, data: [BIO, HIST, WEB] }));
afterEach(() => {
  globalThis.fetch = originalFetch;
});

import { useGroups } from "../useGroups";

describe("useGroups", () => {
  it("fetches Groups on mount", async () => {
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([BIO, HIST, WEB]);
    expect(fetchMock).toHaveBeenCalledWith("/api/groups");
    unmount();
  });

  it("reports a failed load", async () => {
    stubFetch({ success: false, error: "Server error" }, 500);
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    expect(result.current.error).toBe("Server error");
    expect(result.current.data).toEqual([]);
    unmount();
  });

  it("createGroup() sends the Space and name and adds the saved Group", async () => {
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    const saved: CalendarGroup = { id: "group-new", category_id: "space-work", name: "Trip" };
    stubFetch({ success: true, data: saved }, 201);

    let returned: CalendarGroup | undefined;
    await act(async () => {
      returned = await result.current.createGroup("space-work", "Trip");
    });

    expect(returned).toEqual(saved);
    expect(result.current.data).toContainEqual(saved);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/groups");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ category_id: "space-work", name: "Trip" });
    unmount();
  });

  it("createGroup() rejects with the server's message and adds nothing", async () => {
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    stubFetch({ success: false, error: "The selected Space is unavailable" }, 400);

    let message = "";
    await act(async () => {
      await result.current.createGroup("space-gone", "x").catch((e: Error) => { message = e.message; });
    });

    expect(message).toBe("The selected Space is unavailable");
    expect(result.current.data).toHaveLength(3);
    unmount();
  });

  it("renameGroup() replaces the Group with the server's row", async () => {
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    stubFetch({ success: true, data: { ...BIO, name: "Biology" } });

    await act(async () => {
      await result.current.renameGroup(BIO, "Biology");
    });

    expect(result.current.data.find((g) => g.id === BIO.id)?.name).toBe("Biology");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: "Biology" });
    unmount();
  });

  it("renameGroup() keeps the old name when the server refuses", async () => {
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    stubFetch({ success: false, error: "name is required" }, 400);

    await act(async () => {
      await result.current.renameGroup(BIO, " ").catch(() => {});
    });

    expect(result.current.data.find((g) => g.id === BIO.id)?.name).toBe("BIO 102");
    unmount();
  });

  it("deleteGroup() reports the released items, then removes the Group", async () => {
    const released = mock();
    const { result, act, unmount } = renderHook(() => useGroups(released));
    await act(() => {});
    stubFetch({ success: true, data: BIO, events: [{ id: "e1" }], tasks: [{ id: "t1" }] });

    await act(async () => {
      await result.current.deleteGroup(BIO);
    });

    expect(released).toHaveBeenCalledWith([{ id: "e1" }], [{ id: "t1" }], BIO.id);
    expect(result.current.data.map((g) => g.id)).toEqual([HIST.id, WEB.id]);
    unmount();
  });

  it("deleteGroup() leaves everything in place when the server fails", async () => {
    const released = mock();
    const { result, act, unmount } = renderHook(() => useGroups(released));
    await act(() => {});
    stubFetch({ success: false, error: "Group not found" }, 404);

    let message = "";
    await act(async () => {
      await result.current.deleteGroup(BIO).catch((e: Error) => { message = e.message; });
    });

    expect(message).toBe("Group not found");
    expect(released).not.toHaveBeenCalled();
    expect(result.current.data).toHaveLength(3);
    unmount();
  });

  it("deleteGroup() refuses a response without the released items", async () => {
    const released = mock();
    const { result, act, unmount } = renderHook(() => useGroups(released));
    await act(() => {});
    stubFetch({ success: true, data: BIO });

    await act(async () => {
      await result.current.deleteGroup(BIO).catch(() => {});
    });

    expect(released).not.toHaveBeenCalled();
    expect(result.current.data).toHaveLength(3);
    unmount();
  });

  it("reconcileSpaceRemoval() drops that Space's Groups", async () => {
    const { result, act, unmount } = renderHook(() => useGroups());
    await act(() => {});
    await act(() => {
      result.current.reconcileSpaceRemoval("space-school");
    });
    expect(result.current.data).toEqual([WEB]);
    unmount();
  });
});
