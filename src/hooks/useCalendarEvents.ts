"use client";

import { useState, useEffect, useRef } from "react";
import type { CalendarEvent, EventsApiResponse } from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import { eventFormPayload, type EventFormValues } from "@/lib/event-form";
import { reconcileDetachedEvents } from "@/lib/event-color-state";
import { releaseGroup } from "@/lib/group-state";
import { createRowLog, mergeFetched, rollbackFields } from "./row-log";

export interface UseCalendarEventsReturn {
  data: CalendarEvent[];
  loading: boolean;
  error: string | null;
  initialLoading: boolean;
  setError: (e: string | null) => void;
  retry: () => void;
  reconcileSpaceRemoval: (detached: CalendarEvent[], categoryId: string) => void;
  reconcileGroupRemoval: (groupId: string) => void;
  createEvent: (values: EventFormValues) => Promise<CalendarEvent>;
  updateEvent: (id: string, values: EventFormValues) => Promise<CalendarEvent>;
  /** Resolves false when the server rejected the delete and the event came back. */
  deleteEvent: (event: CalendarEvent) => Promise<boolean>;
  changeEventTime: (event: CalendarEvent, start: Date, end: Date) => Promise<void>;
}

export function useCalendarEvents(viewDate: Date): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Flipped after the first *successful* fetch, so the consumer can show a
  // full-screen spinner only on first load, not on re-fetches when
  // navigating months. Stays false on failure so a retry after a failed
  // first load re-shows the spinner.
  const hasLoadedOnce = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [log] = useState(createRowLog);

  // Re-fetches on mount and whenever the visible month changes. GET
  // /api/events isn't date-filtered yet, so this currently re-fetches
  // the same full set on navigation — kept anyway so a date-range query
  // param can be added later without touching this hook.
  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setLoading(true);
      setError(null);
      const since = log.mark();

      try {
        const res = await fetch("/api/events");
        const json: EventsApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load events");
        }

        const fetched = json.data;
        if (!cancelled) {
          setEvents((local) => mergeFetched(fetched, local, log.keepSince(since)));
          if (!hasLoadedOnce.current) {
            hasLoadedOnce.current = true;
            setInitialLoading(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load events"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [viewDate, retryKey, log]);

  const retry = () => {
    setRetryKey((k) => k + 1);
  };

  const createEvent = async (values: EventFormValues): Promise<CalendarEvent> => {
    const json = await mutateResource<CalendarEvent>(
      "/api/events",
      "POST",
      eventFormPayload(values),
      "Failed to create event"
    );

    if (!json.data) {
      throw new Error("Failed to create event");
    }

    const savedEvent = json.data;
    log.touch([savedEvent.id]);
    setEvents((prev) => [...prev, savedEvent]);
    return savedEvent;
  };

  const updateEvent = async (id: string, values: EventFormValues): Promise<CalendarEvent> => {
    const json = await mutateResource<CalendarEvent>(
      `/api/events/${id}`,
      "PATCH",
      eventFormPayload(values),
      "Failed to update event"
    );

    if (!json.data) {
      throw new Error("Failed to update event");
    }

    const savedEvent = json.data;
    log.touch([savedEvent.id]);
    setEvents((prev) =>
      prev.map((event) => (event.id === savedEvent.id ? savedEvent : event))
    );
    return savedEvent;
  };

  // Optimistic: remove from state immediately, roll back on failure.
  const deleteEvent = async (event: CalendarEvent): Promise<boolean> => {
    const release = log.hold(event.id);
    setEvents((prev) => prev.filter((e) => e.id !== event.id));

    try {
      await mutateResource<CalendarEvent>(
        `/api/events/${event.id}`,
        "DELETE",
        undefined,
        "Failed to delete event"
      );
      return true;
    } catch (err) {
      setEvents((prev) => [...prev, event]);
      setError(
        err instanceof Error ? err.message : "Failed to delete event"
      );
      return false;
    } finally {
      release();
    }
  };

  // Optimistic: apply the new start/end immediately so the drag doesn't
  // snap back while the request is in flight. On failure, only start_at
  // and end_at are rolled back (not the whole event) so a concurrent edit
  // that succeeded isn't discarded with the failed move.
  const changeEventTime = async (event: CalendarEvent, start: Date, end: Date): Promise<void> => {
    const attempted = { start_at: start.toISOString(), end_at: end.toISOString() };
    const release = log.hold(event.id);

    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, ...attempted } : e))
    );

    try {
      const json = await mutateResource<CalendarEvent>(
        `/api/events/${event.id}`,
        "PATCH",
        attempted,
        "Failed to update event"
      );

      if (!json.data) {
        throw new Error("Failed to update event");
      }

      const savedEvent = json.data;
      setEvents((prev) =>
        prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
      );
    } catch (err) {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? rollbackFields(e, event, attempted) : e))
      );
      setError(
        err instanceof Error ? err.message : "Failed to update event"
      );
    } finally {
      release();
    }
  };

  return {
    data: events,
    loading,
    error,
    initialLoading,
    setError,
    retry,
    reconcileSpaceRemoval: (detached, categoryId) => {
      log.touch(detached.map((e) => e.id));
      setEvents((current) => reconcileDetachedEvents(current, detached, categoryId));
    },
    reconcileGroupRemoval: (groupId) => {
      log.touch(events.filter((e) => e.group_id === groupId).map((e) => e.id));
      setEvents((current) => releaseGroup(current, groupId));
    },
    createEvent,
    updateEvent,
    deleteEvent,
    changeEventTime,
  };
}
