import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { addMinutes, startOfDay } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar-types";
import { MINUTES_PER_DAY, computeResizeEdgeMinutes } from "@/lib/time-grid-drag-math";
import { lockBodyForDrag, restoreBodyAfterDrag } from "@/lib/body-drag-lock";

/** Tracks an in-progress top/bottom edge drag on one event block. Minutes are
 *  relative to midnight of the day column being dragged in, not full `Date`s,
 *  so the drag math stays simple; the window-level `pointerup` handler converts
 *  back to real dates once the drag ends. `original*` stay fixed for the whole
 *  gesture (the anchor the drag computes deltas from); `live*` is what gets
 *  rendered as the drag moves. */
interface ResizeDrag {
  event: CalendarEvent;
  day: Date;
  eventId: string;
  edge: "top" | "bottom";
  pointerStartY: number;
  originalStartMinutes: number;
  originalEndMinutes: number;
  liveStartMinutes: number;
  liveEndMinutes: number;
}

interface UseResizeDragParams {
  dayHeight: number;
  /** When set, event blocks render resize handles and edge drags fire this.
   *  When absent, resize is disabled. */
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
}

/** The live edge positions of the block being resized, for rendering. */
export interface ResizePreview {
  liveStartMinutes: number;
  liveEndMinutes: number;
}

export interface ResizeDragState {
  onEdgePointerDown: (
    e: ReactPointerEvent<HTMLDivElement>,
    edge: "top" | "bottom",
    event: CalendarEvent,
    day: Date,
    top: number,
    height: number
  ) => void;
  /** True while any edge drag is in progress. */
  active: boolean;
  /** The live edge positions for the given event id, or null if it is not the
   *  block currently being resized. */
  previewFor: (eventId: string) => ResizePreview | null;
}

export function useResizeDrag({ dayHeight, onEventResize }: UseResizeDragParams): ResizeDragState {
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);
  // Mirrors state and props so the window-level handlers, which outlive any
  // single render, always read the latest values without stale closures.
  const resizeDragRef = useRef<ResizeDrag | null>(null);
  const onEventResizeRef = useRef(onEventResize);
  // rAF throttle, so we get at most one state update per animation frame
  // instead of one per raw pointermove event.
  const resizeRafRef = useRef<number | null>(null);
  const latestResizeYRef = useRef<number>(0);

  useEffect(() => {
    resizeDragRef.current = resizeDrag;
    onEventResizeRef.current = onEventResize;
  });

  function cancelPendingResizeFrame() {
    if (resizeRafRef.current !== null) {
      cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
  }

  useEffect(() => {
    return () => cancelPendingResizeFrame();
  }, []);

  function onEdgePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    edge: "top" | "bottom",
    event: CalendarEvent,
    day: Date,
    top: number,
    height: number
  ) {
    e.stopPropagation();

    const originalStartMinutes = (top / 100) * MINUTES_PER_DAY;
    const originalEndMinutes = ((top + height) / 100) * MINUTES_PER_DAY;

    setResizeDrag({
      event,
      day,
      eventId: event.id,
      edge,
      pointerStartY: e.clientY,
      originalStartMinutes,
      originalEndMinutes,
      liveStartMinutes: originalStartMinutes,
      liveEndMinutes: originalEndMinutes,
    });
  }

  const isResizeDragging = resizeDrag !== null;
  useEffect(() => {
    if (!isResizeDragging) return;

    function applyResizeMove() {
      const drag = resizeDragRef.current;
      if (!drag) return;

      const pointerDeltaY = latestResizeYRef.current - drag.pointerStartY;

      setResizeDrag((prev) => {
        if (!prev) return prev;

        const next = computeResizeEdgeMinutes({
          edge: prev.edge,
          pointerDeltaY,
          originalStartMinutes: prev.originalStartMinutes,
          originalEndMinutes: prev.originalEndMinutes,
          dayHeight,
        });

        if (prev.edge === "top") {
          return next === prev.liveStartMinutes ? prev : { ...prev, liveStartMinutes: next };
        }
        return next === prev.liveEndMinutes ? prev : { ...prev, liveEndMinutes: next };
      });
    }

    function onPointerMove(e: PointerEvent) {
      latestResizeYRef.current = e.clientY;
      if (resizeRafRef.current === null) {
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null;
          applyResizeMove();
        });
      }
    }

    function onPointerUp() {
      cancelPendingResizeFrame();
      const drag = resizeDragRef.current;
      if (!drag) return;

      const dayStart = startOfDay(drag.day);
      onEventResizeRef.current?.(
        drag.event,
        addMinutes(dayStart, drag.liveStartMinutes),
        addMinutes(dayStart, drag.liveEndMinutes)
      );
      setResizeDrag(null);
    }

    function onCancel() {
      cancelPendingResizeFrame();
      setResizeDrag(null);
    }

    const previousBodyStyle = lockBodyForDrag("ns-resize");

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("contextmenu", onCancel);

    return () => {
      cancelPendingResizeFrame();
      restoreBodyAfterDrag(previousBodyStyle);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("contextmenu", onCancel);
    };
  });

  function previewFor(eventId: string): ResizePreview | null {
    if (!resizeDrag || resizeDrag.eventId !== eventId) return null;
    return {
      liveStartMinutes: resizeDrag.liveStartMinutes,
      liveEndMinutes: resizeDrag.liveEndMinutes,
    };
  }

  return { onEdgePointerDown, active: isResizeDragging, previewFor };
}
