"use client";

import { useState, useEffect, useRef } from "react";
import type {
  CalendarCategory,
  CalendarEvent,
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
          throw new Error(json.error ?? "Failed to load categories");
        }

        if (!cancelled) {
          setCategories(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load categories"
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

  // Not optimistic: CategoryManager shows its own inline error on failure,
  // so this just throws and lets the caller handle it.
  const createCategory = async (name: string, color: string): Promise<void> => {
    const json = await mutateResource<CalendarCategory>(
      "/api/categories",
      "POST",
      { name, color },
      "Failed to create category"
    );

    if (!json.data) {
      throw new Error("Failed to create category");
    }

    setCategories((prev) => [...prev, json.data as CalendarCategory]);
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
        "Failed to update category"
      );

      if (!json.data) {
        throw new Error("Failed to update category");
      }

      const savedCategory = json.data;
      setCategories((prev) =>
        prev.map((c) => (c.id === savedCategory.id ? savedCategory : c))
      );
    } catch (err) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? previousCategory : c))
      );
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  // Wait for the server's detached-event snapshot before removing the Space.
  // That lets the caller reconcile inherited colors without a visible flash.
  const deleteCategory = async (category: CalendarCategory): Promise<void> => {
    if (!beginCategoryDeletion(deletingCategoryIds.current, category.id)) return;

    try {
      const result = await mutateResource<CalendarCategory, CategoryDeleteApiResponse>(
        `/api/categories/${category.id}`,
        "DELETE",
        undefined,
        "Failed to delete category"
      );
      if (!isCompletedCategoryDeletion(result)) {
        throw new Error("Failed to reconcile deleted Space");
      }
      onSpaceDeletion?.(result.events, category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
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
