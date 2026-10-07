"use client";

import { useState, useEffect, useRef } from "react";
import type {
  CalendarEvent,
  CalendarGroup,
  CalendarTask,
  GroupApiResponse,
  GroupCreateRequest,
  GroupDeleteApiResponse,
  GroupPatchRequest,
  GroupsApiResponse,
} from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import { withoutSpaceGroups } from "@/lib/group-state";

export type ReconcileGroupRemoval = (
  releasedEvents: CalendarEvent[],
  releasedTasks: CalendarTask[],
  groupId: string
) => void;

export interface UseGroupsReturn {
  data: CalendarGroup[];
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  retry: () => void;
  /** The mutations wait for the server and reject with its message, so the dialog that asked can show it beside its own button. */
  createGroup: (categoryId: string, name: string) => Promise<CalendarGroup>;
  renameGroup: (group: CalendarGroup, name: string) => Promise<CalendarGroup>;
  deleteGroup: (group: CalendarGroup) => Promise<void>;
  /** A deleted Space takes its Groups with it. */
  reconcileSpaceRemoval: (categoryId: string) => void;
}

export function useGroups(onGroupDeletion?: ReconcileGroupRemoval): UseGroupsReturn {
  const [groups, setGroups] = useState<CalendarGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const deletingGroupIds = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function fetchGroups() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/groups");
        const json: GroupsApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load Groups");
        }

        if (!cancelled) setGroups(json.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGroups();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const retry = () => setRetryKey((k) => k + 1);

  const createGroup = async (categoryId: string, name: string): Promise<CalendarGroup> => {
    const json = await mutateResource<CalendarGroup, GroupApiResponse>(
      "/api/groups",
      "POST",
      { category_id: categoryId, name } satisfies GroupCreateRequest,
      "Failed to create Group"
    );
    if (!json.data) throw new Error("Failed to create Group");
    const saved = json.data;
    setGroups((prev) => [...prev, saved]);
    return saved;
  };

  const renameGroup = async (group: CalendarGroup, name: string): Promise<CalendarGroup> => {
    const json = await mutateResource<CalendarGroup, GroupApiResponse>(
      `/api/groups/${group.id}`,
      "PATCH",
      { name } satisfies GroupPatchRequest,
      "Failed to rename Group"
    );
    if (!json.data) throw new Error("Failed to rename Group");
    const saved = json.data;
    setGroups((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
    return saved;
  };

  // The Group stays on screen until the server confirms and returns the items
  // it released, so a failed delete changes nothing.
  const deleteGroup = async (group: CalendarGroup): Promise<void> => {
    if (deletingGroupIds.current.has(group.id)) return;
    deletingGroupIds.current.add(group.id);
    try {
      const result = await mutateResource<CalendarGroup, GroupDeleteApiResponse>(
        `/api/groups/${group.id}`,
        "DELETE",
        undefined,
        "Failed to delete Group"
      );
      if (!Array.isArray(result.events) || !Array.isArray(result.tasks)) {
        throw new Error("Failed to reconcile deleted Group");
      }
      onGroupDeletion?.(result.events, result.tasks, group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } finally {
      deletingGroupIds.current.delete(group.id);
    }
  };

  const reconcileSpaceRemoval = (categoryId: string) =>
    setGroups((prev) => withoutSpaceGroups(prev, categoryId));

  return {
    data: groups,
    loading,
    error,
    setError,
    retry,
    createGroup,
    renameGroup,
    deleteGroup,
    reconcileSpaceRemoval,
  };
}
