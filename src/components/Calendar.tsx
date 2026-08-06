"use client";

import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";

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
      />
    </div>
  );
}
