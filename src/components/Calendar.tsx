"use client";

import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import EventModal, { type EventFormValues } from "./EventModal";

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

// TODO: derive from the authenticated session once
// feature/auth-middleware-protected-routes lands — there's no login flow
// yet, so this matches the placeholder user_id already used by
// src/db/data/data.csv's sample events.
const PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
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

  // Selecting a day (from either the mini calendar or the main grid) also
  // moves the shared view to that day's month, so both stay in sync no
  // matter which one triggered the change.
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setViewDate(startOfMonth(date));
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialStart, setModalInitialStart] = useState<Date | undefined>();
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleCreateEvent = (day: Date) => {
    setModalMode("create");
    setModalEvent(null);
    setModalInitialStart(day);
    setModalError(null);
    setModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setModalMode("edit");
    setModalEvent(event);
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (values: EventFormValues) => {
    setModalSubmitting(true);
    setModalError(null);

    try {
      const isEdit = modalMode === "edit" && modalEvent;
      const res = await fetch(
        isEdit ? `/api/events/${modalEvent.id}` : "/api/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
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
                }
          ),
        }
      );
      const json: EventMutationResponse = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(
          json.error ?? `Failed to ${isEdit ? "update" : "create"} event`
        );
      }

      setModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setModalSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full overflow-hidden text-neutral-200">
      <CalendarSidebar
        currentDate={selectedDate}
        viewDate={viewDate}
        onDateSelect={handleDateSelect}
        onViewDateChange={setViewDate}
      />
      <MonthGrid
        selectedDate={selectedDate}
        viewDate={viewDate}
        events={events}
        onDateSelect={handleDateSelect}
        onViewDateChange={setViewDate}
        onCreateEvent={handleCreateEvent}
        onEventClick={handleEventClick}
      />
      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        event={modalEvent}
        initialStart={modalInitialStart}
        onSubmit={handleModalSubmit}
        submitting={modalSubmitting}
        error={modalError}
      />
    </div>
  );
}
