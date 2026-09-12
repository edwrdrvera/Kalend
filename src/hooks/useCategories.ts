"use client";

import { useState, useEffect, useRef } from "react";
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarTask,
  CategoriesApiResponse,
  CategoryDeleteApiResponse,
} from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import {
  beginCategoryDeletion,
  finishCategoryDeletion,
  isCompletedCategoryDeletion,
} from "@/lib/category-deletion";

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
  updateCategory: (category: CalendarCategory, updates: { name?: string; color?: string }) => Promise<void>;
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

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/categories");
        const json: CategoriesApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load Spaces");
        }

        if (!cancelled) {
          setCategories(json.data);
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
  }, [retryKey]);

  const retry = () => {
    setRetryKey((k) => k + 1);
  };

  // Optimistic: adds a temp-ID category immediately so the form can close
  // right away, replaces it with the server's row on success, removes it and
  // surfaces the error on failure (same rollback approach as updateCategory).
  const createCategory = async (name: string, color: string): Promise<void> => {
    const tempId = crypto.randomUUID();
    const optimisticCategory: CalendarCategory = { id: tempId, name, color };

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
      setCategories((prev) =>
        prev.map((c) => (c.id === tempId ? savedCategory : c))
      );
    } catch (err) {
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to create Space");
    }
  };

  // Optimistic: applies the name/color change immediately, rolls back on
  // failure so the UI doesn't flash stale data.
  const updateCategory = async (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ): Promise<void> => {
    const previousCategory = category;
    const optimisticCategory: CalendarCategory = { ...category, ...updates };

    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? optimisticCategory : c))
    );

    try {
      const json = await mutateResource<CalendarCategory>(
        `/api/categories/${category.id}`,
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
    } catch (err) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? previousCategory : c))
      );
      setError(err instanceof Error ? err.message : "Failed to update Space");
    }
  };

  // Wait for the server's detached-item snapshots before removing the Space.
  // That lets the caller reconcile inherited colors without a visible flash.
  const deleteCategory = async (category: CalendarCategory): Promise<void> => {
    if (!beginCategoryDeletion(deletingCategoryIds.current, category.id)) return;

    try {
      const result = await mutateResource<CalendarCategory, CategoryDeleteApiResponse>(
        `/api/categories/${category.id}`,
        "DELETE",
        undefined,
        "Failed to delete Space"
      );
      if (!isCompletedCategoryDeletion(result)) {
        throw new Error("Failed to reconcile deleted Space");
      }
      onSpaceDeletion?.(result.events, result.tasks, category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
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
