"use client";

import { useState, useEffect } from "react";
import type { CalendarTask, TasksApiResponse } from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import { reconcileDetachedTasks } from "@/lib/task-color-state";

export interface UseTasksReturn {
  data: CalendarTask[];
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  retry: () => void;
  createTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  toggleComplete: (task: CalendarTask) => Promise<void>;
  deleteTask: (task: CalendarTask) => Promise<void>;
  reconcileSpaceRemoval: (detachedTasks: CalendarTask[], categoryId: string) => void;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Fetched once on mount. The task list panel shows everything (undated +
  // all due dates) rather than a date-scoped window, so there's no viewDate
  // dependency.
  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/tasks");
        const json: TasksApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load tasks");
        }

        if (!cancelled) {
          setTasks(json.data);
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
  }, [retryKey]);

  const retry = () => {
    setRetryKey((k) => k + 1);
  };

  // Optimistic: adds a temp-ID task immediately so the form can close right
  // away, replaces it with the server's row on success, removes it and
  // surfaces the error on failure (same rollback approach as toggleComplete).
  const createTask = async (
    title: string,
    dueAt?: string,
    categoryId?: string | null
  ): Promise<void> => {
    const tempId = crypto.randomUUID();
    const optimisticTask: CalendarTask = {
      id: tempId,
      title,
      due_at: dueAt ?? null,
      completed: false,
      color: null,
      color_overridden: false,
      category_id: categoryId ?? null,
    };

    setTasks((prev) => [...prev, optimisticTask]);

    try {
      const json = await mutateResource<CalendarTask>(
        "/api/tasks",
        "POST",
        { title, due_at: dueAt, category_id: categoryId },
        "Failed to create task"
      );

      if (!json.data) {
        throw new Error("Failed to create task");
      }

      const savedTask = json.data;
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? savedTask : t))
      );
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  // Optimistic: flips the checkbox immediately, rolls back just the
  // `completed` field on failure.
  const toggleComplete = async (task: CalendarTask): Promise<void> => {
    const previousCompleted = task.completed;
    const optimisticTask: CalendarTask = { ...task, completed: !task.completed };

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? optimisticTask : t))
    );

    try {
      const json = await mutateResource<CalendarTask>(
        `/api/tasks/${task.id}`,
        "PATCH",
        { completed: optimisticTask.completed },
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
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: previousCompleted } : t
        )
      );
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  // Optimistic: removes from state immediately, rolls back on failure.
  const deleteTask = async (task: CalendarTask): Promise<void> => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      await mutateResource<CalendarTask>(
        `/api/tasks/${task.id}`,
        "DELETE",
        undefined,
        "Failed to delete task"
      );
    } catch (err) {
      setTasks((prev) => [...prev, task]);
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const reconcileSpaceRemoval = (
    detachedTasks: CalendarTask[],
    categoryId: string
  ): void => {
    setTasks((current) =>
      reconcileDetachedTasks(current, detachedTasks, categoryId)
    );
  };

  return {
    data: tasks,
    loading,
    error,
    setError,
    retry,
    createTask,
    toggleComplete,
    deleteTask,
    reconcileSpaceRemoval,
  };
}
