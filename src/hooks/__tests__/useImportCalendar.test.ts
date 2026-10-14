import { afterEach, describe, expect, it, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import { ICS_TOO_LARGE_MESSAGE, MAX_ICS_BYTES } from "@/lib/ics-limits";

const { useImportCalendar } = await import("../useImportCalendar");

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const file = (contents: string, name = "calendar.ics") => new File([contents], name, { type: "text/calendar" });

describe("useImportCalendar", () => {
  it("posts the file in the browser's time zone and reports the result", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({
        success: true,
        data: { imported: 42, unchanged: 3, skipped: 1 },
      }));
    }) as unknown as typeof fetch;
    const imported = mock(() => {});
    const hook = renderHook(() => useImportCalendar(imported));
    await hook.act(() => {});

    await hook.act(() => hook.result.current.importFile(file("BEGIN:VCALENDAR\nEND:VCALENDAR\n")));

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(calls[0].url).toBe(`/api/events/import?tz=${encodeURIComponent(tz)}`);
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe("text/calendar");
    expect(calls[0].init.body).toBe("BEGIN:VCALENDAR\nEND:VCALENDAR\n");
    expect(hook.result.current.result).toBe("Imported 42 events, left 3 unchanged, skipped 1");
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.busy).toBe(false);
    expect(imported).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it("rejects a success body that is missing its counts", async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({
      success: true,
      data: { imported: "42" },
    }))) as unknown as typeof fetch;
    const imported = mock(() => {});
    const hook = renderHook(() => useImportCalendar(imported));
    await hook.act(() => {});
    await hook.act(() => hook.result.current.importFile(file("BEGIN:VCALENDAR\nEND:VCALENDAR\n")));
    expect(hook.result.current.error).toBe("Could not import that calendar");
    expect(hook.result.current.result).toBeNull();
    expect(imported).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("shows the server's message and does not reload when the import is refused", async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({
      success: false,
      error: "This file is not a calendar",
    }), { status: 400 })) as unknown as typeof fetch;
    const imported = mock(() => {});
    const hook = renderHook(() => useImportCalendar(imported));
    await hook.act(() => {});
    await hook.act(() => hook.result.current.importFile(file("hello")));
    expect(hook.result.current.error).toBe("This file is not a calendar");
    expect(hook.result.current.result).toBeNull();
    expect(imported).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("refuses a file over the size limit without a request", async () => {
    const fetchMock = mock(async () => new Response());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hook = renderHook(() => useImportCalendar(() => {}));
    await hook.act(() => {});
    const huge = file("x".repeat(MAX_ICS_BYTES + 1));
    await hook.act(() => hook.result.current.importFile(huge));
    expect(hook.result.current.error).toBe(ICS_TOO_LARGE_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
    hook.unmount();
  });
});
