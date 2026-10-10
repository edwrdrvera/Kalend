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
import { createRowLog, landCreate, mergeFetched, rollbackFields } from "./row-log";

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
