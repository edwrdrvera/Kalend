import { useState } from "react";
import type { CalendarEvent } from "@/lib/calendar-types";
import type { UseCalendarEventsReturn } from "@/hooks/useCalendarEvents";

export function useEventSelection(events: Pick<UseCalendarEventsReturn, "data" | "deleteEvent">) {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [pendingEventDeletion, setPendingEventDeletion] = useState<string[] | null>(null);

  const toggle = (event: CalendarEvent) =>
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(event.id)) next.delete(event.id);
      else next.add(event.id);
      return next;
    });

  // Act on the whole selection when the right-clicked event is part of it;
  // otherwise act on just that event.
  const idsForContextMenu = (event: CalendarEvent) =>
    selectedEventIds.has(event.id) ? [...selectedEventIds] : [event.id];

  const confirmDelete = async () => {
    if (!pendingEventDeletion) return;
    const toDelete = events.data.filter((e) => pendingEventDeletion.includes(e.id));
    setPendingEventDeletion(null);
    setSelectedEventIds(new Set());
    for (const event of toDelete) {
      await events.deleteEvent(event);
    }
  };

  return {
    selectedEventIds,
    pendingEventDeletion,
    toggle,
    clear: () => setSelectedEventIds(new Set()),
    idsForContextMenu,
    requestDelete: setPendingEventDeletion,
    cancelDelete: () => setPendingEventDeletion(null),
    confirmDelete,
  };
}
