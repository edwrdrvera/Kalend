"use client";

import { useEffect, useRef } from "react";
import type { AlertKind } from "@/lib/alerts";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar-types";

interface ItemSource<T> {
  data: T[];
  loading: boolean;
  retry: () => void;
}

interface Options {
  events: ItemSource<CalendarEvent>;
  tasks: ItemSource<CalendarTask>;
  openEvent: (event: CalendarEvent) => void;
  openTask: (task: CalendarTask) => void;
  /** Called when the item is still missing after a refetch. */
  onMissing: (message: string) => void;
}

const MISSING_TEXT: Record<AlertKind, string> = {
  event: "That event no longer exists.",
  task: "That task no longer exists.",
};

/**
 * Opens the event or task a reminder is about. This tab may not hold it yet
 * (another tab created it after this one loaded), so a miss refetches the
 * list and opens the item once it arrives. If the refetch still lacks it,
 * the item was deleted, and `onMissing` says so.
 */
export function useAlertItemOpener({ events, tasks, openEvent, openTask, onMissing }: Options) {
  // The item we are waiting for. `started` flips once the refetch is seen
  // loading, so a stale "not loading" from before it began is not read as
  // "finished". Held in a ref because nothing renders from it.
  const waiting = useRef<{ kind: AlertKind; id: string; started: boolean } | null>(null);

  function open(kind: AlertKind, id: string): boolean {
    if (kind === "event") {
      const event = events.data.find((e) => e.id === id);
      if (event) openEvent(event);
      return event !== undefined;
    }
    const task = tasks.data.find((t) => t.id === id);
    if (task) openTask(task);
    return task !== undefined;
  }

  // Runs on every render so it sees the refetch land (new data, loading off).
  useEffect(() => {
    const target = waiting.current;
    if (target === null) return;
    const loading = target.kind === "event" ? events.loading : tasks.loading;
    if (open(target.kind, target.id)) {
      waiting.current = null;
    } else if (loading) {
      target.started = true;
    } else if (target.started) {
      waiting.current = null;
      onMissing(MISSING_TEXT[target.kind]);
    }
  });

  return (kind: AlertKind, id: string) => {
    if (open(kind, id)) return;
    waiting.current = { kind, id, started: false };
    (kind === "event" ? events : tasks).retry();
  };
}
