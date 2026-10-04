import { useState, type RefObject } from "react";
import type { EventFormValues } from "@/lib/event-form";
import type { UseCalendarEventsReturn } from "@/hooks/useCalendarEvents";
import { computePopoverSide } from "@/lib/popover-position";
import type { Membership } from "@/lib/membership";

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
    setTarget(null);
    setPendingRange(null);
  };

  const submit = async (values: EventFormValues) => {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    try {
      await events.createEvent(values);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
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
