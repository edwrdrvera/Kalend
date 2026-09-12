import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import type { CalendarTask } from "@/lib/calendar-types";

// ── Fixtures ───────────────────────────────────────────────────────────

const TASK_A: CalendarTask = {
  id: "task-1",
  title: "Finish problem set",
  due_at: "2026-09-10T23:59:00Z",
  completed: false,
  color: "blue",
  color_overridden: false,
  category_id: null,
};

const TASK_B: CalendarTask = {
  id: "task-2",
  title: "Read chapter 5",
  due_at: null,
  completed: true,
  color: null,
  color_overridden: false,
  category_id: "cat-1",
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

/** Replace the global fetch with a mock returning the given body/status. */
function stubFetch(body: unknown, status = 200) {
  fetchMock = mock(() => mockFetchResponse(body, status));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

/**
 * Return a fetch mock whose response is held until `resolve()` is called.
 * Lets tests inspect the optimistic intermediate state before the server
 * round-trip settles.
 */
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
  stubFetch({ success: true, data: [TASK_A, TASK_B] });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Import after mock setup so the module captures the mocked fetch.
import { useTasks } from "../useTasks";

// ── Tests ──────────────────────────────────────────────────────────────

describe("useTasks", () => {
  it("fetches tasks on mount", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {}); // flush mount + fetch effect

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([TASK_A, TASK_B]);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks");
    unmount();
  });

  it("sets error when fetch fails", async () => {
    stubFetch({ success: false, error: "Server error" }, 500);

    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Server error");
    expect(result.current.data).toEqual([]);
    unmount();
  });

  it("setError() updates the error state", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
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
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    expect(result.current.data).toEqual([TASK_A, TASK_B]);

    // Second fetch returns only TASK_B.
    stubFetch({ success: true, data: [TASK_B] });

    await act(() => {
      result.current.retry();
    });

    expect(result.current.data).toEqual([TASK_B]);
    unmount();
  });

  it("createTask() adds the task optimistically, then sends the selected Space as category_id", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    const newTask: CalendarTask = {
      id: "task-3",
      title: "New task",
      due_at: "2026-09-15T12:00:00Z",
      completed: false,
      color: null,
      color_overridden: false,
      category_id: "cat-1",
    };

    const resolve = deferredFetch({ success: true, data: newTask });

    const createPromise = result.current.createTask(
      "New task",
      "2026-09-15T12:00:00Z",
      "cat-1"
    );
    await act(() => {});

    // The optimistic task should already be visible, under a temp id.
    expect(result.current.data).toHaveLength(3);
    const optimistic = result.current.data[2];
    expect(optimistic.title).toBe("New task");
    expect(optimistic.category_id).toBe("cat-1");
    expect(optimistic.id).not.toBe(newTask.id);

    await act(async () => {
      resolve();
      await createPromise;
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New task",
        due_at: "2026-09-15T12:00:00Z",
        category_id: "cat-1",
      }),
    });
    // The temp entry is replaced by the server's row (real id).
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[2]).toEqual(newTask);
    unmount();
  });

  it("createTask() sends explicit No Space as category_id null", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    stubFetch({ success: true, data: { ...TASK_A, id: "task-3", due_at: null } });

    await act(async () => {
      await result.current.createTask("Finish problem set", undefined, null);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Finish problem set", category_id: null }),
    });
    unmount();
  });

  it("createTask() rolls back the optimistic task on failure", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    const dataBefore = result.current.data;

    stubFetch({ success: false, error: "Validation failed" }, 400);

    await act(async () => {
      await result.current.createTask("Bad task");
    });

    expect(result.current.data).toEqual(dataBefore);
    expect(result.current.error).toBe("Validation failed");
    unmount();
  });

  it("toggleComplete() flips completed optimistically before the server responds", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    const serverTask: CalendarTask = { ...TASK_A, completed: true };
    const resolve = deferredFetch({ success: true, data: serverTask });

    // Start the mutation but don't resolve the server response yet.
    const togglePromise = result.current.toggleComplete(TASK_A);
    await act(() => {});

    // The optimistic update should already be visible.
    const optimistic = result.current.data.find((t) => t.id === TASK_A.id);
    expect(optimistic?.completed).toBe(true);

    // Now let the server respond and flush.
    await act(async () => {
      resolve();
      await togglePromise;
    });

    const final = result.current.data.find((t) => t.id === TASK_A.id);
    expect(final?.completed).toBe(true);
    unmount();
  });

  it("toggleComplete() rolls back completed on failure", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    stubFetch({ success: false, error: "Update failed" }, 500);

    await act(async () => {
      await result.current.toggleComplete(TASK_A);
    });

    const task = result.current.data.find((t) => t.id === TASK_A.id);
    expect(task?.completed).toBe(false); // rolled back
    expect(result.current.error).toBe("Update failed");
    unmount();
  });

  it("deleteTask() removes the task optimistically before the server responds", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    const resolve = deferredFetch({ success: true });

    // Start the mutation but don't resolve the server response yet.
    const deletePromise = result.current.deleteTask(TASK_A);
    await act(() => {});

    // The task should already be gone from data.
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe(TASK_B.id);

    // Now let the server respond.
    await act(async () => {
      resolve();
      await deletePromise;
    });

    expect(result.current.data).toHaveLength(1);
    unmount();
  });

  it("deleteTask() restores the task on failure", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    stubFetch({ success: false, error: "Delete failed" }, 500);

    await act(async () => {
      await result.current.deleteTask(TASK_A);
    });

    expect(result.current.data).toHaveLength(2);
    const restored = result.current.data.find((t) => t.id === TASK_A.id);
    expect(restored).toBeDefined();
    expect(result.current.error).toBe("Delete failed");
    unmount();
  });

  it("reconcileSpaceRemoval() applies detached color fields without clobbering task data", async () => {
    const { result, act, unmount } = renderHook(() => useTasks());
    await act(() => {});

    await act(() => {
      result.current.reconcileSpaceRemoval(
        [{
          ...TASK_B,
          title: "Stale title",
          due_at: "2026-09-01T12:00:00Z",
          completed: false,
          color: "green",
          color_overridden: false,
          category_id: null,
        }],
        "cat-1"
      );
    });

    expect(result.current.data).toEqual([
      TASK_A,
      {
        ...TASK_B,
        color: "green",
        color_overridden: false,
        category_id: null,
      },
    ]);
    unmount();
  });
});
