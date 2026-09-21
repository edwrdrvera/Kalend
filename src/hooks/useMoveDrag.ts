import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { addMinutes, startOfDay } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar-types";
import {
  MINUTES_PER_DAY,
  computeDayIndexFromX,
  computeGhostDelta,
  computeMoveStartMinutes,
  passedDragThreshold,
  pointerToMinutes,
} from "@/lib/time-grid-drag-math";
import { lockBodyForDrag, restoreBodyAfterDrag } from "@/lib/body-drag-lock";

// A click on an event block within this many ms of that same event's drag
// ending is treated as the tail end of that drag, not a new click. Bounded
// rather than open-ended so a dropped click can't block future clicks.
const CLICK_SUPPRESS_WINDOW_MS = 300;

/** Tracks an in-progress drag of a whole event block to a new day/time. Only
 *  the static, once-per-gesture geometry lives here. The fields that change on
 *  every pointer move (the ghost's live day/time) are written straight to
 *  `liveDragRef` and the ghost element's own style instead, so moving the
 *  pointer doesn't re-render. `moved` only flips true once the pointer travels
 *  past the drag threshold, so a plain click never fires `onEventMove`. */
interface MoveDrag {
  event: CalendarEvent;
  pointerStartX: number;
  pointerStartY: number;
  originalDayIndex: number;
  originalStartMinutes: number;
  /** The event's real duration, taken from its start/end, not from the
   *  rendered block's clamped height. */
  durationMinutes: number;
  /** Minutes between the pointer and the block's real (unclamped) top edge at
   *  pickup, so the block doesn't jump to be centred under the cursor. */
  grabOffsetMinutes: number;
  moved: boolean;
  /** Pixel offset and width of the origin day column within the grid, captured
   *  at pickup so ghost positioning accounts for CSS grid gaps. */
  originColumnLeft: number;
  columnWidth: number;
}

/** The drag's current day/time, snapped, written on every pointer move and read
 *  once on drop. Kept in a ref, not state, since it changes far more often than
 *  the component needs to re-render. */
interface LiveDragTarget {
  dayIndex: number;
  startMinutes: number;
}

interface UseMoveDragParams {
  gridRef: RefObject<HTMLDivElement | null>;
  dayHeight: number;
  days: Date[];
  /** When set, event blocks are draggable and a completed move fires this.
   *  When absent, blocks don't move. */
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  /** True while a resize owns the pointer; a move must not start then. */
  blockedByResize: boolean;
}

/** The ghost preview to render while a move is visibly in progress. */
export interface MoveGhost {
  event: CalendarEvent;
  originColumnLeft: number;
  columnWidth: number;
  originalStartMinutes: number;
  durationMinutes: number;
}

export interface MoveDragState {
  onBlockPointerDown: (
    e: ReactPointerEvent<HTMLButtonElement>,
    event: CalendarEvent,
    dayIndex: number,
    day: Date
  ) => void;
  /** True (and clears the flag) when the click that follows a completed drag of
   *  this event should be swallowed instead of opening the editor. */
  wasJustDragged: (eventId: string) => boolean;
  /** True while a move is in progress in any phase, for other gestures' guards. */
  active: boolean;
  /** True once the pointer has travelled past the threshold, so the origin
   *  block dims and every block's resize handles hide. */
  moved: boolean;
  /** The id of the block being visibly dragged, or null. */
  draggingEventId: string | null;
  /** The ghost to render while a move is visibly in progress, or null. */
  ghost: MoveGhost | null;
  /** Ref to attach to the ghost element; its transform tracks the pointer. */
  ghostRef: RefObject<HTMLDivElement | null>;
}

export function useMoveDrag({
  gridRef,
  dayHeight,
  days,
  onEventMove,
  blockedByResize,
}: UseMoveDragParams): MoveDragState {
  const [moveDrag, setMoveDrag] = useState<MoveDrag | null>(null);
  // Mirrors state and props so the window-level handlers, which outlive any
  // single render, always read the latest values without stale closures.
  const moveDragRef = useRef<MoveDrag | null>(null);
  // Where the ghost would drop right now, snapped. Written on every pointer
  // move, read once on drop. Never React state, so updating it never renders.
  const liveDragRef = useRef<LiveDragTarget | null>(null);
  // True for the rest of the gesture once the one-time `moved: true` state
  // update has fired, so later frames (which run before that re-render catches
  // moveDragRef up) don't fire it again.
  const hasStartedMoveRef = useRef(false);
  // The floating ghost block. Its transform is written straight to this node in
  // applyPointerMove, bypassing React state so it never lags a render behind.
  const ghostRef = useRef<HTMLDivElement>(null);
  // The id of the event whose drag most recently ended, so the click that
  // follows a real drag can be told apart from an unrelated click on the same
  // block. Cleared automatically after CLICK_SUPPRESS_WINDOW_MS so it can't get
  // stuck if that click never fires.
  const lastDraggedEventIdRef = useRef<string | null>(null);
  const suppressClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Coalesces rapid native pointermove events into at most one ghost-position
  // update per animation frame.
  const rafIdRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const daysRef = useRef(days);
  const onEventMoveRef = useRef(onEventMove);

  useEffect(() => {
    moveDragRef.current = moveDrag;
    daysRef.current = days;
    onEventMoveRef.current = onEventMove;
  });

  function cancelPendingMoveFrame() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      cancelPendingMoveFrame();
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
      }
    };
  }, []);

  function clientYToMinutes(clientY: number): number {
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    return pointerToMinutes(clientY, top, dayHeight);
  }

  function onBlockPointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    event: CalendarEvent,
    dayIndex: number,
    day: Date
  ) {
    if (!onEventMove || blockedByResize) return;
    e.stopPropagation();

    const dayStart = startOfDay(day);
    const originalStartMinutes = (new Date(event.start_at).getTime() - dayStart.getTime()) / 60_000;
    const originalEndMinutes = (new Date(event.end_at).getTime() - dayStart.getTime()) / 60_000;

    // Capture column pixel metrics at pickup so the ghost and day-index
    // calculations stay correct even with CSS grid gaps between columns.
    const gridEl = gridRef.current;
    const gridRect = gridEl?.getBoundingClientRect();
    const columnEl = gridEl?.children[dayIndex] as HTMLElement | undefined;
    const columnRect = columnEl?.getBoundingClientRect();
    const originColumnLeft = columnRect && gridRect ? columnRect.left - gridRect.left : 0;
    const columnWidth = columnRect?.width ?? (gridRect ? gridRect.width / days.length : 0);

    hasStartedMoveRef.current = false;
    liveDragRef.current = { dayIndex, startMinutes: originalStartMinutes };
    setMoveDrag({
      event,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      originalDayIndex: dayIndex,
      originalStartMinutes,
      durationMinutes: originalEndMinutes - originalStartMinutes,
      grabOffsetMinutes: clientYToMinutes(e.clientY) - originalStartMinutes,
      moved: false,
      originColumnLeft,
      columnWidth,
    });
  }

  function applyPointerMove(clientX: number, clientY: number) {
    const drag = moveDragRef.current;
    if (!drag) return;

    const deltaX = clientX - drag.pointerStartX;
    const deltaY = clientY - drag.pointerStartY;
    if (!drag.moved && !passedDragThreshold(deltaX, deltaY)) return;

    // Flips `moved` exactly once per gesture. hasStartedMoveRef guards it
    // rather than drag.moved itself, since moveDragRef only catches up to this
    // state change after the next render and later frames can fire before that.
    if (!hasStartedMoveRef.current) {
      hasStartedMoveRef.current = true;
      setMoveDrag((prev) => (prev ? { ...prev, moved: true } : prev));
    }

    // The ghost tracks the pointer 1:1 in pixels via a transform written
    // straight to its DOM node, not the snapped position, so it never visibly
    // steps or lags behind the cursor. The snapped values that actually place
    // the event are computed separately below and read once, on drop. gridRef
    // is always mounted while a move-drag runs, so rect is non-null; the ghost
    // update is simply skipped in the impossible null case.
    const rect = gridRef.current?.getBoundingClientRect();

    if (rect && ghostRef.current) {
      const ghost = computeGhostDelta({
        deltaX,
        deltaY,
        gridWidth: rect.width,
        columnWidth: drag.columnWidth,
        originColumnLeft: drag.originColumnLeft,
        originalStartMinutes: drag.originalStartMinutes,
        durationMinutes: drag.durationMinutes,
        dayHeight,
      });
      ghostRef.current.style.transform = `translate3d(${ghost.x}px, ${ghost.y}px, 0)`;
    }

    const liveStartMinutes = computeMoveStartMinutes({
      clientY,
      gridTop: rect?.top ?? 0,
      dayHeight,
      grabOffsetMinutes: drag.grabOffsetMinutes,
      durationMinutes: drag.durationMinutes,
    });

    let liveDayIndex = drag.originalDayIndex;
    if (rect && drag.columnWidth > 0) {
      liveDayIndex = computeDayIndexFromX({
        clientX,
        gridLeft: rect.left,
        gridWidth: rect.width,
        columnWidth: drag.columnWidth,
        dayCount: days.length,
      });
    }

    liveDragRef.current = { dayIndex: liveDayIndex, startMinutes: liveStartMinutes };
  }

  // Window listeners guarantee the drag ends cleanly even when the pointer
  // leaves the element or the browser steals focus. The effect fires when a
  // move-drag becomes active and cleans up when it ends.
  const isMoveDragging = moveDrag !== null;
  useEffect(() => {
    if (!isMoveDragging) return;

    function onPointerMove(e: PointerEvent) {
      latestPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const pointer = latestPointerRef.current;
          if (pointer) applyPointerMove(pointer.clientX, pointer.clientY);
        });
      }
    }

    function onPointerUp() {
      cancelPendingMoveFrame();
      const drag = moveDragRef.current;
      if (!drag) return;

      if (hasStartedMoveRef.current && liveDragRef.current) {
        const target = liveDragRef.current;

        lastDraggedEventIdRef.current = drag.event.id;
        if (suppressClearTimeoutRef.current !== null) {
          clearTimeout(suppressClearTimeoutRef.current);
        }
        suppressClearTimeoutRef.current = setTimeout(() => {
          lastDraggedEventIdRef.current = null;
          suppressClearTimeoutRef.current = null;
        }, CLICK_SUPPRESS_WINDOW_MS);

        const dayStart = startOfDay(daysRef.current[target.dayIndex]);
        onEventMoveRef.current?.(
          drag.event,
          addMinutes(dayStart, target.startMinutes),
          addMinutes(dayStart, target.startMinutes + drag.durationMinutes)
        );
      }
      setMoveDrag(null);
      hasStartedMoveRef.current = false;
      liveDragRef.current = null;
    }

    function onCancel() {
      cancelPendingMoveFrame();
      setMoveDrag(null);
      hasStartedMoveRef.current = false;
      liveDragRef.current = null;
    }

    const previousBodyStyle = lockBodyForDrag("grabbing");

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("contextmenu", onCancel);

    return () => {
      cancelPendingMoveFrame();
      restoreBodyAfterDrag(previousBodyStyle);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("contextmenu", onCancel);
    };
  });

  function wasJustDragged(eventId: string): boolean {
    if (lastDraggedEventIdRef.current !== eventId) return false;
    lastDraggedEventIdRef.current = null;
    if (suppressClearTimeoutRef.current !== null) {
      clearTimeout(suppressClearTimeoutRef.current);
      suppressClearTimeoutRef.current = null;
    }
    return true;
  }

  const moved = moveDrag?.moved ?? false;
  const ghost: MoveGhost | null =
    moveDrag && moveDrag.moved
      ? {
          event: moveDrag.event,
          originColumnLeft: moveDrag.originColumnLeft,
          columnWidth: moveDrag.columnWidth,
          originalStartMinutes: moveDrag.originalStartMinutes,
          durationMinutes: moveDrag.durationMinutes,
        }
      : null;

  return {
    onBlockPointerDown,
    wasJustDragged,
    active: isMoveDragging,
    moved,
    draggingEventId: moved && moveDrag ? moveDrag.event.id : null,
    ghost,
    ghostRef,
  };
}
