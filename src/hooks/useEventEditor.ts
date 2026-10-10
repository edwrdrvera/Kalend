import { useRef, useState, type RefObject } from "react";
import type { EventFormValues } from "@/lib/event-form";
import type { UseCalendarEventsReturn } from "@/hooks/useCalendarEvents";
import { computePopoverSide } from "@/lib/popover-position";
import type { Membership } from "@/lib/membership";
import type { CalendarEvent } from "@/lib/calendar-types";

type EventWrites = Pick<UseCalendarEventsReturn, "createEvent">;

interface EventEditorTarget {
  rect: DOMRect;
  side: "left" | "right";
  start: Date;
  end: Date | null;
  initialSpaceId: string | null;
  initialGroupId: string | null;
}

export function useEventEditor(
  events: EventWrites,
  selectedSpaceId: string | null,
  containerRef: RefObject<HTMLElement | null>,
  onOpenCreated: (event: CalendarEvent) => void = () => {}
) {
  const [target, setTarget] = useState<EventEditorTarget | null>(null);
  // The sketched box from a drag-create, kept visible until the popover
  // closes (any outside click, or a successful create) or it's replaced.
  const [pendingRange, setPendingRange] = useState<{ start: Date; end: Date } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  // Each open or close starts a new editor session. A create that resolves
  // after its session ended must not touch the editor now on screen.
  const session = useRef(0);
  const submittingSession = useRef<number | null>(null);

  const open = (next: Omit<EventEditorTarget, "side">) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const side = containerRect ? computePopoverSide(next.rect, containerRect) : "right";
    session.current += 1;
    setTarget({ ...next, side });
    setError(null);
    setSubmitting(false);
    setKey((k) => k + 1);
  };

  // `initial` places the new event: a Group's panel passes its own membership.
  // Without it the event starts in the focused Space.
  const openCreate = (day: Date, rect: DOMRect, initial?: Membership) =>
    open({
      rect,
      start: day,
      end: null,
      initialSpaceId: initial ? initial.category_id : selectedSpaceId,
      initialGroupId: initial ? initial.group_id : null,
    });

  const openCreateRange = (start: Date, end: Date, rect: DOMRect) => {
    open({ rect, start, end, initialSpaceId: selectedSpaceId, initialGroupId: null });
    setPendingRange({ start, end });
  };

  const close = () => {
    session.current += 1;
    setTarget(null);
    setPendingRange(null);
    setSubmitting(false);
  };

  // `openDetails` hands the saved event to the right panel, for the fields the
  // quick popover doesn't have (description, reminder).
  const submit = async (values: EventFormValues, openDetails = false) => {
    const mine = session.current;
    if (!target || submittingSession.current === mine) return;
    submittingSession.current = mine;
    setSubmitting(true);
    setError(null);
    try {
      const created = await events.createEvent(values);
      if (session.current !== mine) return;
      close();
      if (openDetails) onOpenCreated(created);
    } catch (err) {
      if (session.current !== mine) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (submittingSession.current === mine) submittingSession.current = null;
      if (session.current === mine) setSubmitting(false);
    }
  };

  return {
    target,
    pendingRange,
    submitting,
    error,
    key,
    openCreate,
    openCreateRange,
    submit,
    close,
  };
}
