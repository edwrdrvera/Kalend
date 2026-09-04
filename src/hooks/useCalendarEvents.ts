"use client";

import { useState, useEffect, useRef } from "react";
import type { CalendarEvent, EventsApiResponse } from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import type { EventFormValues } from "@/components/EventModal";

export interface UseCalendarEventsReturn {
  data: CalendarEvent[];
  loading: boolean;
  error: string | null;
  initialLoading: boolean;
  setError: (e: string | null) => void;
  retry: () => void;
  createEvent: (values: EventFormValues) => Promise<CalendarEvent>;
  updateEvent: (id: string, values: EventFormValues) => Promise<CalendarEvent>;
  deleteEvent: (event: CalendarEvent) => Promise<void>;
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

  // Re-fetches on mount and whenever the visible month changes. GET
  // /api/events isn't date-filtered yet, so this currently re-fetches
  // the same full set on navigation — kept anyway so a date-range query
  // param can be added later without touching this hook.
  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events");
        const json: EventsApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load events");
        }

        if (!cancelled) {
          setEvents(json.data);
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
  }, [viewDate, retryKey]);

  const retry = () => {
    setRetryKey((k) => k + 1);
  };

  const createEvent = async (values: EventFormValues): Promise<CalendarEvent> => {
    const json = await mutateResource<CalendarEvent>(
      "/api/events",
      "POST",
      {
        title: values.title,
        start_at: values.startAt,
        end_at: values.endAt,
        color: values.color,
        category_id: values.categoryId,
      },
      "Failed to create event"
    );

    if (!json.data) {
      throw new Error("Failed to create event");
    }

    const savedEvent = json.data;
    setEvents((prev) => [...prev, savedEvent]);
    return savedEvent;
  };

  const updateEvent = async (id: string, values: EventFormValues): Promise<CalendarEvent> => {
    const json = await mutateResource<CalendarEvent>(
      `/api/events/${id}`,
      "PATCH",
      {
        title: values.title,
        start_at: values.startAt,
        end_at: values.endAt,
        color: values.color,
        category_id: values.categoryId,
      },
      "Failed to update event"
    );

    if (!json.data) {
      throw new Error("Failed to update event");
    }

    const savedEvent = json.data;
    setEvents((prev) =>
      prev.map((event) => (event.id === savedEvent.id ? savedEvent : event))
    );
    return savedEvent;
  };

  // Optimistic: remove from state immediately, roll back on failure.
  const deleteEvent = async (event: CalendarEvent): Promise<void> => {
    setEvents((prev) => prev.filter((e) => e.id !== event.id));

    try {
      await mutateResource<CalendarEvent>(
        `/api/events/${event.id}`,
        "DELETE",
        undefined,
        "Failed to delete event"
      );
    } catch (err) {
      setEvents((prev) => [...prev, event]);
      setError(
        err instanceof Error ? err.message : "Failed to delete event"
      );
    }
  };

  // Optimistic: apply the new start/end immediately so the drag doesn't
  // snap back while the request is in flight. On failure, only start_at
  // and end_at are rolled back (not the whole event) so a concurrent edit
  // that succeeded isn't discarded with the failed move.
  const changeEventTime = async (event: CalendarEvent, start: Date, end: Date): Promise<void> => {
    const previousStartAt = event.start_at;
    const previousEndAt = event.end_at;
    const optimisticEvent: CalendarEvent = {
      ...event,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    };

    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? optimisticEvent : e))
    );

    try {
      const json = await mutateResource<CalendarEvent>(
        `/api/events/${event.id}`,
        "PATCH",
        { start_at: optimisticEvent.start_at, end_at: optimisticEvent.end_at },
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
        prev.map((e) =>
          e.id === event.id
            ? { ...e, start_at: previousStartAt, end_at: previousEndAt }
            : e
        )
      );
      setError(
        err instanceof Error ? err.message : "Failed to update event"
      );
    }
  };

  return {
    data: events,
    loading,
    error,
    initialLoading,
    setError,
    retry,
    createEvent,
    updateEvent,
    deleteEvent,
    changeEventTime,
  };
}
