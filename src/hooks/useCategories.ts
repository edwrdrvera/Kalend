"use client";

import { useState, useEffect, useRef } from "react";
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarTask,
  CategoriesApiResponse,
  CategoryPatchRequest,
  CategoryDeleteApiResponse,
} from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import {
  beginCategoryDeletion,
  finishCategoryDeletion,
  isCompletedCategoryDeletion,
} from "@/lib/category-deletion";
import { createRowLog, landCreate, mergeFetched, rollbackFields } from "./row-log";

export type ReconcileSpaceRemoval = (
  detachedEvents: CalendarEvent[],
  detachedTasks: CalendarTask[],
  categoryId: string
) => void;

export interface UseCategoriesReturn {
  data: CalendarCategory[];
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  retry: () => void;
  createCategory: (name: string, color: string) => Promise<void>;
  /** Resolves false when the server rejected the update and it was rolled back. */
  updateCategory: (category: CalendarCategory, updates: CategoryPatchRequest) => Promise<boolean>;
  deleteCategory: (category: CalendarCategory) => Promise<void>;
}

export function useCategories(
  onSpaceDeletion?: ReconcileSpaceRemoval
): UseCategoriesReturn {
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const deletingCategoryIds = useRef(new Set<string>());
  const [log] = useState(createRowLog);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setLoading(true);
      setError(null);
      const since = log.mark();

      try {
        const res = await fetch("/api/categories");
        const json: CategoriesApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load Spaces");
        }

        const fetched = json.data;
        if (!cancelled) {
          setCategories((local) => mergeFetched(fetched, local, log.keepSince(since)));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load Spaces"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, [retryKey, log]);

  const retry = () => {
    setRetryKey((k) => k + 1);
  };

  // Optimistic: adds a temp-ID category immediately so the form can close
  // right away, replaces it with the server's row on success, removes it and
  // surfaces the error on failure. Edits made on the temp row meanwhile wait
  // in `log.settle` and go to the saved id.
  const createCategory = async (name: string, color: string): Promise<void> => {
    const tempId = crypto.randomUUID();
    const optimisticCategory: CalendarCategory = { id: tempId, name, color, description: null };
    const pending = log.createPending(tempId);
    const release = log.hold(tempId);

    setCategories((prev) => [...prev, optimisticCategory]);

    try {
      const json = await mutateResource<CalendarCategory>(
        "/api/categories",
        "POST",
        { name, color },
        "Failed to create Space"
      );

      if (!json.data) {
        throw new Error("Failed to create Space");
      }

      const savedCategory = json.data;
      log.touch([savedCategory.id]);
      setCategories((prev) => landCreate(prev, tempId, optimisticCategory, savedCategory));
      pending.land(savedCategory.id);
    } catch (err) {
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      pending.fail();
      setError(err instanceof Error ? err.message : "Failed to create Space");
    } finally {
      release();
    }
  };

  // Optimistic: applies the change immediately, rolls back only the changed
  // fields on failure.
  const updateCategory = async (
    category: CalendarCategory,
    updates: CategoryPatchRequest
  ): Promise<boolean> => {
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, ...updates } : c))
    );

    const saved = await log.settle(category.id, async (id) => {
      try {
        const json = await mutateResource<CalendarCategory>(
          `/api/categories/${id}`,
          "PATCH",
          updates,
          "Failed to update Space"
        );

        if (!json.data) {
          throw new Error("Failed to update Space");
        }

        const savedCategory = json.data;
        setCategories((prev) =>
          prev.map((c) => (c.id === savedCategory.id ? savedCategory : c))
        );
        return true;
      } catch (err) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? rollbackFields(c, category, updates) : c))
        );
        setError(err instanceof Error ? err.message : "Failed to update Space");
        return false;
      }
    });
    return saved ?? false;
  };

  // Wait for the server's detached-item snapshots before removing the Space.
  // That lets the caller reconcile inherited colors without a visible flash.
  const deleteCategory = async (category: CalendarCategory): Promise<void> => {
    if (!beginCategoryDeletion(deletingCategoryIds.current, category.id)) return;

    try {
      await log.settle(category.id, async (id) => {
        const result = await mutateResource<CalendarCategory, CategoryDeleteApiResponse>(
          `/api/categories/${id}`,
          "DELETE",
          undefined,
          "Failed to delete Space"
        );
        if (!isCompletedCategoryDeletion(result)) {
          throw new Error("Failed to reconcile deleted Space");
        }
        onSpaceDeletion?.(result.events, result.tasks, id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Space");
    } finally {
      finishCategoryDeletion(deletingCategoryIds.current, category.id);
    }
  };

  return {
    data: categories,
    loading,
    error,
    setError,
    retry,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
