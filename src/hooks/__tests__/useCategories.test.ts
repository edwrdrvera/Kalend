import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";

// ── Fixtures ───────────────────────────────────────────────────────────

const CAT_A: CalendarCategory = {
  id: "cat-1",
  name: "Homework",
  color: "blue",
};

const CAT_B: CalendarCategory = {
  id: "cat-2",
  name: "Work",
  color: null,
};

const DETACHED_EVENT: CalendarEvent = {
  id: "event-1",
  title: "Lecture",
  start_at: "2026-09-08T10:00:00Z",
  end_at: "2026-09-08T11:00:00Z",
  color: "green",
  color_overridden: false,
  category_id: null,
};

// ── Fetch mock ─────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof mock>;
const originalFetch = globalThis.fetch;

function mockFetchResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function stubFetch(body: unknown, status = 200) {
  fetchMock = mock(() => mockFetchResponse(body, status));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

function deferredFetch(body: unknown, status = 200) {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => {
    resolve = r;
  });
  fetchMock = mock(
    () =>
      gate.then(() =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })
      )
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return resolve;
}

beforeEach(() => {
  stubFetch({ success: true, data: [CAT_A, CAT_B] });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Import after mock setup so the module captures the mocked fetch.
import { useCategories } from "../useCategories";

// ── Tests ──────────────────────────────────────────────────────────────

describe("useCategories", () => {
  it("fetches categories on mount", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([CAT_A, CAT_B]);
    expect(fetchMock).toHaveBeenCalledWith("/api/categories");
    unmount();
  });

  it("sets error when fetch fails", async () => {
    stubFetch({ success: false, error: "Server error" }, 500);

    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Server error");
    expect(result.current.data).toEqual([]);
    unmount();
  });

  it("setError() updates the error state", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    expect(result.current.error).toBeNull();

    await act(() => {
      result.current.setError("something went wrong");
    });
    expect(result.current.error).toBe("something went wrong");

    await act(() => {
      result.current.setError(null);
    });
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("retry() re-fetches and delivers fresh data", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    expect(result.current.data).toEqual([CAT_A, CAT_B]);

    stubFetch({ success: true, data: [CAT_B] });

    await act(() => {
      result.current.retry();
    });

    expect(result.current.data).toEqual([CAT_B]);
    unmount();
  });

  it("createCategory() appends the new category to data", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    const newCat: CalendarCategory = { id: "cat-3", name: "Exams", color: "red" };
    stubFetch({ success: true, data: newCat });

    await act(async () => {
      await result.current.createCategory("Exams", "red");
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[2]).toEqual(newCat);
    unmount();
  });

  it("createCategory() throws and leaves data unchanged on failure", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    const dataBefore = result.current.data;

    stubFetch({ success: false, error: "Validation failed" }, 400);

    let thrownError: Error | null = null;
    await act(async () => {
      try {
        await result.current.createCategory("Bad", "red");
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError).not.toBeNull();
    expect(thrownError!.message).toBe("Validation failed");
    expect(result.current.data).toEqual(dataBefore);
    unmount();
  });

  it("updateCategory() optimistically applies updates before server responds", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    const serverCat: CalendarCategory = { ...CAT_A, name: "Renamed", color: "green" };
    const resolve = deferredFetch({ success: true, data: serverCat });

    const updatePromise = result.current.updateCategory(CAT_A, { name: "Renamed", color: "green" });
    await act(() => {});

    // Optimistic state should already show the updates.
    const optimistic = result.current.data.find((c) => c.id === CAT_A.id);
    expect(optimistic?.name).toBe("Renamed");
    expect(optimistic?.color).toBe("green");

    await act(async () => {
      resolve();
      await updatePromise;
    });

    const final = result.current.data.find((c) => c.id === CAT_A.id);
    expect(final).toEqual(serverCat);
    unmount();
  });

  it("updateCategory() rolls back on failure", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    stubFetch({ success: false, error: "Update failed" }, 500);

    await act(async () => {
      await result.current.updateCategory(CAT_A, { name: "Renamed" });
    });

    const cat = result.current.data.find((c) => c.id === CAT_A.id);
    expect(cat?.name).toBe("Homework"); // rolled back
    expect(result.current.error).toBe("Update failed");
    unmount();
  });

  it("deleteCategory() reconciles confirmed deletion before removing the category", async () => {
    const onSpaceDeletion = mock(() => {});
    const { result, act, unmount } = renderHook(() => useCategories(onSpaceDeletion));
    await act(() => {});

    const resolve = deferredFetch({ success: true, data: CAT_A, events: [DETACHED_EVENT] });

    const deletePromise = result.current.deleteCategory(CAT_A);
    await act(() => {});

    expect(result.current.data).toEqual([CAT_A, CAT_B]);

    await act(async () => {
      resolve();
      await deletePromise;
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe(CAT_B.id);
    expect(onSpaceDeletion).toHaveBeenCalledWith([DETACHED_EVENT], CAT_A.id);
    unmount();
  });

  it("deleteCategory() keeps the category when the server rejects deletion", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    stubFetch({ success: false, error: "Delete failed" }, 500);

    await act(async () => {
      await result.current.deleteCategory(CAT_A);
    });

    expect(result.current.data).toEqual([CAT_A, CAT_B]);
    expect(result.current.error).toBe("Delete failed");
    unmount();
  });

  it("deleteCategory() ignores a duplicate request while a deletion is pending", async () => {
    const { result, act, unmount } = renderHook(() => useCategories());
    await act(() => {});

    const resolve = deferredFetch({ success: true, data: CAT_A, events: [] });
    const first = result.current.deleteCategory(CAT_A);
    const second = result.current.deleteCategory(CAT_A);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
      await Promise.all([first, second]);
    });

    expect(result.current.data).toEqual([CAT_B]);
    unmount();
  });
});
