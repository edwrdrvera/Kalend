"use client";

import { useState, useEffect } from "react";
import type {
  CalendarTask,
  TaskCreateRequest,
  TaskPatchRequest,
  TasksApiResponse,
} from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import { reconcileDetachedTasks } from "@/lib/task-color-state";
import { releaseGroup } from "@/lib/group-state";
import { UNASSIGNED, type Membership } from "@/lib/membership";

type Row = { id: string };

/**
 * What each list hook needs to know so a slow response can't undo a newer
 * change: which rows a list load must leave alone, and the saved id behind
 * each optimistic create. Bookkeeping only, so it never causes a render.
 */
export interface RowLog {
  /** The stamp a list load takes when it starts. */
  mark(): number;
  /** Rows a load stamped `since` must not overwrite: a request on them is in flight, or settled after the load began. */
  keepSince(since: number): ReadonlySet<string>;
  /** Marks rows changed now, for changes that need no request of their own. */
  touch(ids: Iterable<string>): void;
  /** Holds a row against list loads until the returned release is called. */
  hold(id: string): () => void;
  /** Registers an optimistic create. Edits on `tempId` wait until it lands or fails. */
  createPending(tempId: string): { land: (savedId: string) => void; fail: () => void };
  /**
   * Runs `send` with the row's saved id, holding the row until it settles.
   * For a row still being created this waits for the create, and resolves
   * null without sending anything if the create failed.
   */
  settle<R>(id: string, send: (savedId: string) => Promise<R>): Promise<R | null>;
}

export function createRowLog(): RowLog {
  let clock = 0;
  const inFlight = new Map<string, number>();
  const settledAt = new Map<string, number>();
  const savedIds = new Map<string, Promise<string | null>>();

  const hold = (id: string) => {
    inFlight.set(id, (inFlight.get(id) ?? 0) + 1);
    return () => {
      const left = (inFlight.get(id) ?? 1) - 1;
      if (left === 0) inFlight.delete(id);
      else inFlight.set(id, left);
      settledAt.set(id, ++clock);
    };
  };

  const holdWhile = async <R,>(id: string, work: () => Promise<R>): Promise<R> => {
    const release = hold(id);
    try {
      return await work();
    } finally {
      release();
    }
  };

  return {
    mark: () => ++clock,
    keepSince(since) {
      const keep = new Set(inFlight.keys());
      for (const [id, at] of settledAt) if (at > since) keep.add(id);
      return keep;
    },
    touch(ids) {
      for (const id of ids) hold(id)();
    },
    hold,
    createPending(tempId) {
      let resolve!: (savedId: string | null) => void;
      savedIds.set(tempId, new Promise((r) => (resolve = r)));
      return { land: resolve, fail: () => resolve(null) };
    },
    settle(id, send) {
      const created = savedIds.get(id);
      // Saved rows send in the same tick, so the request has started by the
      // time the caller's call returns.
      if (!created) return holdWhile(id, () => send(id));
      return holdWhile(id, async () => {
        const savedId = await created;
        return savedId === null ? null : holdWhile(savedId, () => send(savedId));
      });
    },
  };
}

/**
 * The server's list, except rows in `keep`: those keep their local copy, stay
 * gone if they were deleted locally, and are appended if the server doesn't
 * have them yet.
 */
export function mergeFetched<T extends Row>(server: T[], local: T[], keep: ReadonlySet<string>): T[] {
  if (keep.size === 0) return server;
  const localById = new Map(local.map((row) => [row.id, row]));
  const serverIds = new Set(server.map((row) => row.id));
  const merged = server.flatMap((row) => {
    if (!keep.has(row.id)) return [row];
    const mine = localById.get(row.id);
    return mine ? [mine] : [];
  });
  return [...merged, ...local.filter((row) => keep.has(row.id) && !serverIds.has(row.id))];
}

/**
 * Undoes a failed edit: restores only the fields it wrote, and only where the
 * row still shows what it wrote, so a later edit to the same field wins.
 */
export function rollbackFields<T>(row: T, before: T, attempted: Partial<T>): T {
  const restored = { ...row };
  for (const key of Object.keys(attempted) as (keyof T)[]) {
    if (Object.is(row[key], attempted[key])) restored[key] = before[key];
  }
  return restored;
}

/**
 * Swaps an optimistic row for the saved one. Fields the user changed while the
 * create was in flight stay, because their own requests are still on the way.
 */
export function landCreate<T extends Row>(rows: T[], tempId: string, sent: T, saved: T): T[] {
  return rows
    .filter((row) => row.id !== saved.id)
    .map((row) => {
      if (row.id !== tempId) return row;
      const landed = { ...saved };
      for (const key of Object.keys(row) as (keyof T)[]) {
        if (key !== "id" && !Object.is(row[key], sent[key])) landed[key] = row[key];
      }
      return landed;
    });
}

export interface UseTasksReturn {
  data: CalendarTask[];
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  retry: () => void;
  createTask: (title: string, dueAt?: string, membership?: Membership) => Promise<void>;
  toggleComplete: (task: CalendarTask) => Promise<void>;
  /** Resolves false on failure without raising the shared error toast, so
   *  the caller can keep its draft and show the error beside its own Save. */
  updateTask: (task: CalendarTask, patch: TaskPatchRequest) => Promise<boolean>;
  deleteTask: (task: CalendarTask) => Promise<boolean>;
  reconcileSpaceRemoval: (detachedTasks: CalendarTask[], categoryId: string) => void;
  reconcileGroupRemoval: (groupId: string) => void;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [log] = useState(createRowLog);

  // Fetched once on mount. The task list panel shows everything (undated +
  // all due dates) rather than a date-scoped window, so there's no viewDate
  // dependency.
  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setError(null);
      const since = log.mark();

      try {
        const res = await fetch("/api/tasks");
        const json: TasksApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load tasks");
        }

        const fetched = json.data;
        if (!cancelled) {
          setTasks((local) => mergeFetched(fetched, local, log.keepSince(since)));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load tasks"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [retryKey, log]);

  const retry = () => {
    setRetryKey((k) => k + 1);
  };

  // Optimistic: adds a temp-ID task immediately so the form can close right
  // away, replaces it with the server's row on success, removes it and
  // surfaces the error on failure. Edits made on the temp row meanwhile wait
  // in `log.settle` and go to the saved id.
  const createTask = async (
    title: string,
    dueAt?: string,
    membership: Membership = UNASSIGNED
  ): Promise<void> => {
    const tempId = crypto.randomUUID();
    const optimisticTask: CalendarTask = {
      id: tempId,
      title,
      due_at: dueAt ?? null,
      completed: false,
      color: null,
      color_overridden: false,
      category_id: membership.category_id,
      group_id: membership.group_id,
    };
    const pending = log.createPending(tempId);
    const release = log.hold(tempId);

    setTasks((prev) => [...prev, optimisticTask]);

    try {
      const json = await mutateResource<CalendarTask>(
        "/api/tasks",
        "POST",
        {
          title,
          due_at: dueAt,
          category_id: membership.category_id,
          group_id: membership.group_id,
        } satisfies TaskCreateRequest,
        "Failed to create task"
      );

      if (!json.data) {
        throw new Error("Failed to create task");
      }

      const savedTask = json.data;
      log.touch([savedTask.id]);
      setTasks((prev) => landCreate(prev, tempId, optimisticTask, savedTask));
      pending.land(savedTask.id);
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      pending.fail();
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      release();
    }
  };

  // Optimistic: flips the checkbox immediately, rolls back just the
  // `completed` field on failure.
  const toggleComplete = async (task: CalendarTask): Promise<void> => {
    const attempted = { completed: !task.completed } satisfies TaskPatchRequest;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, ...attempted } : t))
    );

    await log.settle(task.id, async (id) => {
      try {
        const json = await mutateResource<CalendarTask>(
          `/api/tasks/${id}`,
          "PATCH",
          attempted,
          "Failed to update task"
        );

        if (!json.data) {
          throw new Error("Failed to update task");
        }

        const savedTask = json.data;
        setTasks((prev) =>
          prev.map((t) => (t.id === savedTask.id ? savedTask : t))
        );
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? rollbackFields(t, task, attempted) : t))
        );
        setError(err instanceof Error ? err.message : "Failed to update task");
      }
    });
  };

  // Optimistic: applies the patch immediately, restores the patched fields on
  // failure.
  const updateTask = async (
    task: CalendarTask,
    patch: TaskPatchRequest
  ): Promise<boolean> => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));

    const saved = await log.settle(task.id, async (id) => {
      try {
        const json = await mutateResource<CalendarTask>(
          `/api/tasks/${id}`,
          "PATCH",
          patch,
          "Failed to update task"
        );
        if (!json.data) throw new Error("Failed to update task");
        const savedTask = json.data;
        setTasks((prev) => prev.map((t) => (t.id === savedTask.id ? savedTask : t)));
        return true;
      } catch {
        setTasks((prev) => prev.map((t) => (t.id === id ? rollbackFields(t, task, patch) : t)));
        return false;
      }
    });
    return saved ?? false;
  };

  // Optimistic: removes from state immediately, rolls back on failure.
  const deleteTask = async (task: CalendarTask): Promise<boolean> => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    const deleted = await log.settle(task.id, async (id) => {
      try {
        await mutateResource<CalendarTask>(
          `/api/tasks/${id}`,
          "DELETE",
          undefined,
          "Failed to delete task"
        );
        return true;
      } catch (err) {
        setTasks((prev) => [...prev, { ...task, id }]);
        setError(err instanceof Error ? err.message : "Failed to delete task");
        return false;
      }
    });
    return deleted ?? true;
  };

  const reconcileSpaceRemoval = (
    detachedTasks: CalendarTask[],
    categoryId: string
  ): void => {
    log.touch(detachedTasks.map((t) => t.id));
    setTasks((current) =>
      reconcileDetachedTasks(current, detachedTasks, categoryId)
    );
  };

  const reconcileGroupRemoval = (groupId: string): void => {
    log.touch(tasks.filter((t) => t.group_id === groupId).map((t) => t.id));
    setTasks((current) => releaseGroup(current, groupId));
  };

  return {
    data: tasks,
    loading,
    error,
    setError,
    retry,
    createTask,
    toggleComplete,
    updateTask,
    deleteTask,
    reconcileSpaceRemoval,
    reconcileGroupRemoval,
  };
}
