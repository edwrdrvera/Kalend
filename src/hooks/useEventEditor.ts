import { useState, type RefObject } from "react";
import type { EventFormValues } from "@/lib/event-form";
import type { CalendarEvent } from "@/lib/calendar-types";
import type { UseCalendarEventsReturn } from "@/hooks/useCalendarEvents";
import { computePopoverSide } from "@/lib/popover-position";

type EventWrites = Pick<UseCalendarEventsReturn, "createEvent" | "updateEvent" | "deleteEvent">;

interface EventEditorTarget {
  rect: DOMRect;
  side: "left" | "right";
  event: CalendarEvent | null;
  start: Date;
  end: Date | null;
  initialSpaceId: string | null;
}

export function useEventEditor(
  events: EventWrites,
  selectedSpaceId: string | null,
  containerRef: RefObject<HTMLElement | null>
) {
  const [target, setTarget] = useState<EventEditorTarget | null>(null);
  // The sketched box from a drag-create, kept visible until the popover
  // closes (any outside click, or a successful create) or it's replaced.
  const [pendingRange, setPendingRange] = useState<{ start: Date; end: Date } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const open = (next: Omit<EventEditorTarget, "side">) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const side = containerRect ? computePopoverSide(next.rect, containerRect) : "right";
    setTarget({ ...next, side });
    setError(null);
    setKey((k) => k + 1);
  };

  const openCreate = (day: Date, rect: DOMRect) =>
    open({ rect, event: null, start: day, end: null, initialSpaceId: selectedSpaceId });

  const openCreateRange = (start: Date, end: Date, rect: DOMRect) => {
    open({ rect, event: null, start, end, initialSpaceId: selectedSpaceId });
    setPendingRange({ start, end });
  };

  const openEdit = (event: CalendarEvent, rect: DOMRect) =>
    open({
      rect,
      event,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      initialSpaceId: event.category_id,
    });

  const close = () => {
    setTarget(null);
    setPendingRange(null);
  };

  const submit = async (values: EventFormValues) => {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    try {
      if (target.event) {
        await events.updateEvent(target.event.id, values);
      } else {
        await events.createEvent(values);
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!target?.event) return;
    const event = target.event;
    setTarget(null);
    await events.deleteEvent(event);
  };

  return {
    target,
    pendingRange,
    submitting,
    error,
    key,
    openCreate,
    openCreateRange,
    openEdit,
    submit,
    remove,
    close,
    // The breadcrumb leaves a drag-created range drawn, unlike close().
    closeKeepingRange: () => setTarget(null),
  };
}
