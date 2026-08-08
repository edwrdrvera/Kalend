"use client";

import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventModal, { type EventFormValues } from "./EventModal";
import type { CalendarView } from "./ViewSwitcher";

// Wire shape of an event as returned by GET /api/events: dates arrive as
// ISO strings over JSON, not the `Date` objects the Drizzle `Event` type
// declares server-side.
export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  color: string | null;
}

interface EventsApiResponse {
  success: boolean;
  data?: CalendarEvent[];
  error?: string;
}

interface EventMutationResponse {
  success: boolean;
  data?: CalendarEvent;
  error?: string;
}

// Shared by create/edit, delete, and move below, which otherwise each
// re-implement the same fetch-then-check-the-response-shape block. Doesn't
// enforce `data` being present, since DELETE's response doesn't include
// it — callers that need `data` (create/edit, move) check for it after.
async function mutateEvent(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: object | undefined,
  fallbackError: string
): Promise<EventMutationResponse> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: EventMutationResponse = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? fallbackError);
  }
  return json;
}

// TODO: derive from the authenticated session once
// feature/auth-middleware-protected-routes lands — there's no login flow
// yet, so this matches the placeholder user_id already used by
// src/db/data/data.csv's sample events.
const PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<CalendarView>("month");
  const [mounted, setMounted] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-fetches on mount and whenever the visible month changes. GET
  // /api/events isn't date-filtered yet (see TASKS.md), so this currently
  // re-fetches the same full set on navigation — kept anyway so a
  // date-range query param can be added later without touching this hook.
  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setEventsLoading(true);
      setEventsError(null);

      try {
        const res = await fetch("/api/events");
        const json: EventsApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load events");
        }

        if (!cancelled) {
          setEvents(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setEventsError(
            err instanceof Error ? err.message : "Failed to load events"
          );
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [viewDate]);

  // Selecting a day (from the mini calendar, or any of the main grids) also
  // moves the shared view to that day, so both stay in sync no matter which
  // one triggered the change. In month view that means jumping to that
  // day's month; in week/day view, viewDate becomes the day itself, since
  // WeekGrid/DayGrid derive the days they show from it directly, jumping to
  // that day's month would skip past the week or day actually clicked.
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setViewDate(view === "month" ? startOfMonth(date) : date);
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialStart, setModalInitialStart] = useState<Date | undefined>();
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  // Bumped every time the modal is opened so `key={modalKey}` below forces
  // EventModal to remount with fresh initial state, instead of an effect
  // resetting its fields after the fact.
  const [modalKey, setModalKey] = useState(0);

  const handleCreateEvent = (day: Date) => {
    setModalMode("create");
    setModalEvent(null);
    setModalInitialStart(day);
    setModalError(null);
    setModalOpen(true);
    setModalKey((key) => key + 1);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setModalMode("edit");
    setModalEvent(event);
    setModalError(null);
    setModalOpen(true);
    setModalKey((key) => key + 1);
  };

  const handleModalSubmit = async (values: EventFormValues) => {
    setModalSubmitting(true);
    setModalError(null);

    try {
      const isEdit = modalMode === "edit" && modalEvent;
      const fallbackError = `Failed to ${isEdit ? "update" : "create"} event`;
      const json = await mutateEvent(
        isEdit ? `/api/events/${modalEvent.id}` : "/api/events",
        isEdit ? "PATCH" : "POST",
        isEdit
          ? {
              title: values.title,
              start_at: values.startAt,
              end_at: values.endAt,
              color: values.color,
            }
          : {
              title: values.title,
              start_at: values.startAt,
              end_at: values.endAt,
              color: values.color,
              user_id: PLACEHOLDER_USER_ID,
            },
        fallbackError
      );

      if (!json.data) {
        throw new Error(fallbackError);
      }

      const savedEvent = json.data;
      setEvents((prev) =>
        isEdit
          ? prev.map((event) => (event.id === savedEvent.id ? savedEvent : event))
          : [...prev, savedEvent]
      );

      setModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Optimistic: remove from state and close the modal immediately, rather
  // than waiting on the DELETE response. On failure the event is put back
  // and eventsError surfaces why.
  const handleDeleteEvent = async () => {
    if (!modalEvent) return;

    const eventToDelete = modalEvent;
    setEvents((prev) => prev.filter((event) => event.id !== eventToDelete.id));
    setModalOpen(false);

    try {
      await mutateEvent(
        `/api/events/${eventToDelete.id}`,
        "DELETE",
        undefined,
        "Failed to delete event"
      );
    } catch (err) {
      setEvents((prev) => [...prev, eventToDelete]);
      setEventsError(
        err instanceof Error ? err.message : "Failed to delete event"
      );
    }
  };

  // Optimistic: applies the new start/end immediately (so the drag doesn't
  // snap back while the request is in flight), then reconciles with the
  // server response. On failure, only start_at/end_at are rolled back
  // (not the whole event) so a concurrent edit that succeeded in the
  // meantime — e.g. a title change via the modal while this move's PATCH
  // was still in flight — isn't discarded along with the failed move.
  const handleEventMove = async (event: CalendarEvent, start: Date, end: Date) => {
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
      const json = await mutateEvent(
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
      setEventsError(
        err instanceof Error ? err.message : "Failed to update event"
      );
    }
  };

  const handleEventResize = async (event: CalendarEvent, start: Date, end: Date) => {
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
      const json = await mutateEvent(
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
      setEventsError(
        err instanceof Error ? err.message : "Failed to update event"
      );
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative flex h-full w-full overflow-hidden text-neutral-200">
      {eventsError && (
        <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-neutral-800 px-4 py-2.5 text-sm text-neutral-200 shadow-lg ring-1 ring-neutral-700">
          <span>{eventsError}</span>
          <button
            type="button"
            onClick={() => setEventsError(null)}
            aria-label="Dismiss"
            className="text-neutral-400 transition-colors hover:text-neutral-200"
          >
            ✕
          </button>
        </div>
      )}
      <CalendarSidebar
        currentDate={selectedDate}
        viewDate={viewDate}
        onDateSelect={handleDateSelect}
        onViewDateChange={setViewDate}
      />
      {view === "month" && (
        <MonthGrid
          selectedDate={selectedDate}
          viewDate={viewDate}
          events={events}
          onDateSelect={handleDateSelect}
          onViewDateChange={setViewDate}
          onCreateEvent={handleCreateEvent}
          onEventClick={handleEventClick}
          view={view}
          onViewChange={setView}
        />
      )}
      {view === "week" && (
        <WeekGrid
          selectedDate={selectedDate}
          viewDate={viewDate}
          events={events}
          onDateSelect={handleDateSelect}
          onViewDateChange={setViewDate}
          onCreateEvent={handleCreateEvent}
          onEventClick={handleEventClick}
          onEventMove={handleEventMove}
          onEventResize={handleEventResize}
          view={view}
          onViewChange={setView}
        />
      )}
      {view === "day" && (
        <DayGrid
          viewDate={viewDate}
          events={events}
          onDateSelect={handleDateSelect}
          onViewDateChange={setViewDate}
          onCreateEvent={handleCreateEvent}
          onEventClick={handleEventClick}
          onEventMove={handleEventMove}
          onEventResize={handleEventResize}
          view={view}
          onViewChange={setView}
        />
      )}
      <EventModal
        key={modalKey}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        event={modalEvent}
        initialStart={modalInitialStart}
        onSubmit={handleModalSubmit}
        onDelete={handleDeleteEvent}
        submitting={modalSubmitting}
        error={modalError}
      />
    </div>
  );
}
