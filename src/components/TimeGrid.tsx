"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { format, isSameDay, startOfDay, addMinutes } from "date-fns";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  getEventColorClasses,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
import { layoutDayEvents } from "@/lib/time-grid-layout";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** Default hour-row height, used by the week view. */
export const HOUR_HEIGHT_PX = 64;
/** Day view is zoomed out (shorter rows) so more of the day fits on screen. */
export const DAY_VIEW_HOUR_HEIGHT_PX = 44;
const MINUTES_PER_DAY = 24 * 60;

// Drags snap the time to this increment.
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
// A press on an event block has to travel this many pixels before it counts
// as a drag rather than a click (which opens the edit modal instead).
const DRAG_THRESHOLD_PX = 4;
// A click on an event block within this many ms of that same event's drag
// ending is treated as the tail end of that drag, not a new click — bounded
// rather than open-ended so a dropped click can't block future clicks.
const CLICK_SUPPRESS_WINDOW_MS = 300;

function formatHourLabel(hour: number): string {
  // 12-hour format. Midnight is kept empty so the label
  // doesn't crowd the very top of the grid (same as Google Calendar's treatment).
  if (hour === 0) return "";
  return format(new Date(2000, 0, 1, hour), "h a");
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Body text-select/cursor locking for the duration of a drag gesture.
 *  Kept at module scope on purpose: the React Compiler (via
 *  eslint-plugin-react-hooks) rejects `document.body.style.* = ...` writes
 *  that sit inside the component body, even within an effect. A plain
 *  module-level function is opaque to that analysis, so the imperative DOM
 *  work lives here instead. Returns the previous values to restore on
 *  cleanup. */
interface BodyDragStyle {
  userSelect: string;
  cursor: string;
}

function lockBodyForDrag(cursor: string): BodyDragStyle {
  const previous: BodyDragStyle = {
    userSelect: document.body.style.userSelect,
    cursor: document.body.style.cursor,
  };
  document.body.style.userSelect = "none";
  document.body.style.cursor = cursor;
  return previous;
}

function restoreBodyAfterDrag(previous: BodyDragStyle): void {
  document.body.style.userSelect = previous.userSelect;
  document.body.style.cursor = previous.cursor;
}

/** Ticks once a minute so the current-time line stays roughly accurate
 *  without re-rendering on every second. */
function useCurrentTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/** Tracks an in-progress drag of a whole event block to a new day/time.
 *  Only the static, once-per-gesture geometry lives here — the fields that
 *  change on every pointer move (the ghost's live day/time) are written
 *  straight to `liveDragRef` and the ghost element's own style instead, so
 *  moving the pointer doesn't re-render TimeGrid (see `applyPointerMove`).
 *  `moved` only flips true once the pointer travels past
 *  `DRAG_THRESHOLD_PX`, so a plain click never fires `onEventMove`; that one
 *  flip is the only state update a move-drag causes before it ends. */
interface MoveDrag {
  /** Snapshot of the event taken at pickup, so the ghost preview (and the
   *  isBeingDragged check below) don't need to re-scan `events` by id on
   *  every render while the drag is in progress. */
  event: CalendarEvent;
  pointerStartX: number;
  pointerStartY: number;
  originalDayIndex: number;
  originalStartMinutes: number;
  /** The event's real duration, taken from its start/end — not from the
   *  rendered block's height, which `layoutDayEvents` clamps to a minimum
   *  for short events and would otherwise inflate them on every move. */
  durationMinutes: number;
  /** Minutes between the pointer and the block's real (unclamped) top edge
   *  at pickup, so the block doesn't jump to be centered under the cursor. */
  grabOffsetMinutes: number;
  moved: boolean;
  /** Pixel offset and width of the origin day column within gridRef,
   *  captured at pickup so ghost positioning accounts for CSS grid gaps. */
  originColumnLeft: number;
  columnWidth: number;
}

/** The drag's current day/time, snapped to `SNAP_MINUTES` — written on every
 *  pointer move and read once, on drop, to build the `onEventMove` call.
 *  Kept in a ref rather than state since it changes far more often than the
 *  component needs to re-render. */
interface LiveDragTarget {
  dayIndex: number;
  startMinutes: number;
}

/** Tracks an in-progress top/bottom edge drag on one event block. Minutes
 *  are relative to midnight of the day column being dragged in, not full
 *  `Date`s, so the drag math stays simple; the window-level `pointerup`
 *  handler converts back to real dates once the drag ends. `original*`
 *  stay fixed for the whole gesture (the anchor the drag computes deltas
 *  from); `live*` is what gets rendered as the drag moves. */
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

/** Tracks an in-progress drag across empty slots to create a new event. All
 *  minutes are relative to midnight of the column being dragged in. `anchor`
 *  is where the pointer went down; `live` follows the pointer. `moved` flips
 *  true only once the pointer travels past DRAG_THRESHOLD_PX, so a plain click
 *  (which selects the day) never creates an event. */
interface CreateDrag {
  dayIndex: number;
  day: Date;
  anchorMinutes: number;
  liveMinutes: number;
  pointerStartY: number;
  moved: boolean;
}

interface TimeGridProps {
  /** One column per entry — a single day for the Day view, seven for Week. */
  days: Date[];
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** Single click on an empty slot: select that day. */
  onSlotSelect?: (day: Date) => void;
  /** Double click on an empty slot: create an event at that hour. */
  onSlotCreate?: (day: Date, hour: number, anchorRect: DOMRect) => void;
  /** Drag across empty slots: create an event spanning the dragged range. */
  onSlotDragCreate?: (start: Date, end: Date, anchorRect: DOMRect) => void;
  /** Right-click on an empty slot: open a create menu. */
  onSlotContextMenu?: (day: Date, hour: number, x: number, y: number) => void;
  onEventClick?: (event: CalendarEvent, anchorRect: DOMRect) => void;
  /** Shift+click on an event: toggle it in the multi-selection. */
  onEventShiftClick?: (event: CalendarEvent) => void;
  /** Right-click on an event: open a delete menu. */
  onEventContextMenu?: (event: CalendarEvent, x: number, y: number) => void;
  /** Ids of events currently multi-selected (rendered with a ring). */
  selectedEventIds?: Set<string>;
  /** Fires once a whole-block drag is released, with the event's new
   *  start/end (same duration, possibly a different day). Event blocks
   *  only become draggable when this is provided. */
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  /** Fires once a top/bottom edge drag is released, with the event's new
   *  start/end. Resize handles only render when this is provided. */
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  /** The sketched box from a drag-create, kept visible on its day column
   *  while the popover it opened is still open. */
  pendingRange?: { start: Date; end: Date } | null;
  /** Height of one hour row in px. Defaults to the week view's HOUR_HEIGHT_PX;
   *  the day view passes a smaller value to zoom out. */
  hourHeight?: number;
}

/** Shared hour-by-hour grid used by both the Week and Day views: one row per
 *  hour, a line marking the current time, and each day's events positioned
 *  by time with overlapping events placed side by side (see
 *  `layoutDayEvents`). Dragging an event block moves it to a new day and/or
 *  time, and dragging its top or bottom edge resizes it, snapped to
 *  `SNAP_MINUTES`. */
export default function TimeGrid({
  days,
  events,
  categories,
  onSlotSelect,
  onSlotCreate,
  onSlotDragCreate,
  onSlotContextMenu,
  onEventClick,
  onEventShiftClick,
  onEventContextMenu,
  selectedEventIds,
  onEventMove,
  onEventResize,
  pendingRange,
  hourHeight = HOUR_HEIGHT_PX,
}: TimeGridProps) {
  const now = useCurrentTime();
  // Total grid height derived from the (view-specific) hour-row height.
  const dayHeight = HOURS.length * hourHeight;
  const nowOffsetPx = (minutesFromMidnight(now) / (24 * 60)) * dayHeight;
  // Show the current-time marker (line + gutter label) only when one of the
  // visible columns is actually today.
  const showNow = days.some((day) => isSameDay(day, now));
  // Day view is a single column, so the per-day background accents (today
  // tint, weekend shading) that help tell week columns apart only make the
  // whole surface look mismatched. Keep day view a flat card surface.
  const isDayView = days.length === 1;

  const gridRef = useRef<HTMLDivElement>(null);

  // ── Move-drag refs ─────────────────────────────────────────────────
  const [moveDrag, setMoveDrag] = useState<MoveDrag | null>(null);
  // Mirrors `moveDrag` so the window-level event handlers (which outlive
  // any single render) always read the latest drag state.
  const moveDragRef = useRef<MoveDrag | null>(null);
  // Where the ghost preview would drop right now, snapped to SNAP_MINUTES.
  // Written on every pointer move, read once on pointer up — never in
  // React state, so updating it doesn't trigger a render.
  const liveDragRef = useRef<LiveDragTarget | null>(null);
  // True for the rest of the gesture once `applyPointerMove` has fired the
  // one-time `moved: true` state update, so later frames (which run before
  // the state update above has actually re-rendered and caught moveDragRef
  // up) don't fire it again.
  const hasStartedMoveRef = useRef(false);
  // The floating ghost block rendered while a move-drag is in progress (see
  // the JSX below). Its position tracks the raw pointer via a CSS transform
  // written directly to this node in `applyPointerMove`, bypassing React
  // state entirely so the ghost never lags a render behind the cursor and
  // moving it doesn't force every day column to re-render.
  const ghostRef = useRef<HTMLDivElement>(null);
  // Holds the id of the event whose drag most recently ended, so the click
  // that follows a real drag's pointerup can be told apart from an
  // unrelated click on the same block — cleared automatically after
  // CLICK_SUPPRESS_WINDOW_MS via suppressClearTimeoutRef below rather than
  // left for a click to clear, so it can't get stuck if that click never
  // fires.
  const lastDraggedEventIdRef = useRef<string | null>(null);
  const suppressClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Coalesces rapid native pointermove events (which can fire faster than
  // the display refreshes) into at most one ghost-position update per
  // animation frame, instead of one per raw event.
  const rafIdRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  // ── Resize-drag refs ───────────────────────────────────────────────
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);
  const resizeDragRef = useRef<ResizeDrag | null>(null);
  // rAF throttle for resize, same pattern as move-drag.
  const resizeRafRef = useRef<number | null>(null);
  const latestResizeYRef = useRef<number>(0);

  // ── Create-drag refs ───────────────────────────────────────────────
  const [createDrag, setCreateDrag] = useState<CreateDrag | null>(null);
  const createDragRef = useRef<CreateDrag | null>(null);
  // Suppresses the click that fires after a create-drag ends, so the drag
  // doesn't also select the day.
  const suppressSlotClickRef = useRef(false);

  // ── Prop refs ──────────────────────────────────────────────────────
  // Keep refs in sync with state/props so window-level event handlers
  // always read the latest values without stale closures.
  const daysRef = useRef(days);
  const onEventMoveRef = useRef(onEventMove);
  const onEventResizeRef = useRef(onEventResize);
  const onSlotDragCreateRef = useRef(onSlotDragCreate);

  useEffect(() => {
    moveDragRef.current = moveDrag;
    resizeDragRef.current = resizeDrag;
    createDragRef.current = createDrag;
    daysRef.current = days;
    onEventMoveRef.current = onEventMove;
    onEventResizeRef.current = onEventResize;
    onSlotDragCreateRef.current = onSlotDragCreate;
  });

  function clientYToMinutes(clientY: number): number {
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    return ((clientY - top) / dayHeight) * MINUTES_PER_DAY;
  }

  function cancelPendingMoveFrame() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  function cancelPendingResizeFrame() {
    if (resizeRafRef.current !== null) {
      cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      cancelPendingMoveFrame();
      cancelPendingResizeFrame();
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
      }
    };
  }, []);

  function handleMovePointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    event: CalendarEvent,
    dayIndex: number,
    day: Date
  ) {
    if (!onEventMove || resizeDrag) return;
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
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    // Flips `moved` exactly once per gesture — this is the only React state
    // update a move-drag causes before it ends (it's what mounts the ghost
    // and dims the origin block). `hasStartedMoveRef` guards it rather than
    // `drag.moved` itself: `moveDragRef` only catches up to this state
    // change after the next render, and later frames can fire before that
    // happens.
    if (!hasStartedMoveRef.current) {
      hasStartedMoveRef.current = true;
      setMoveDrag((prev) => (prev ? { ...prev, moved: true } : prev));
    }

    // The ghost tracks the pointer 1:1 in pixels via a transform written
    // straight to its DOM node — not the SNAP_MINUTES-rounded position — so
    // it never visibly steps or lags behind the cursor. The snapped values
    // used to actually place the event are computed separately below and
    // only ever read once, on drop.
    const rect = gridRef.current?.getBoundingClientRect();
    const dayColumnWidth = drag.columnWidth;
    const durationPx = (drag.durationMinutes / MINUTES_PER_DAY) * dayHeight;
    const originalLeftPx = drag.originColumnLeft;
    const originalTopPx = (drag.originalStartMinutes / MINUTES_PER_DAY) * dayHeight;

    const clampedDeltaX = rect
      ? clamp(deltaX, -originalLeftPx, rect.width - dayColumnWidth - originalLeftPx)
      : deltaX;
    const clampedDeltaY = clamp(deltaY, -originalTopPx, dayHeight - durationPx - originalTopPx);

    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${clampedDeltaX}px, ${clampedDeltaY}px, 0)`;
    }

    // Snaps the absolute time under the pointer (minus the fixed grab
    // offset), not the raw movement delta — so the block's start always
    // lands on a clean SNAP_MINUTES mark even when the event's real start
    // wasn't already on one.
    const liveStartMinutes = clamp(
      snapMinutes(clientYToMinutes(clientY) - drag.grabOffsetMinutes),
      0,
      MINUTES_PER_DAY - drag.durationMinutes
    );

    // Derive the gap between columns from the known column width and grid
    // width so the day-index calculation stays accurate with CSS grid gaps.
    let liveDayIndex = drag.originalDayIndex;
    if (rect && dayColumnWidth > 0) {
      const gapSize = days.length > 1
        ? (rect.width - days.length * dayColumnWidth) / (days.length - 1)
        : 0;
      const stepSize = dayColumnWidth + gapSize;
      const relX = clientX - rect.left;
      liveDayIndex = Math.min(days.length - 1, Math.max(0, Math.floor(relX / stepSize)));
    }

    liveDragRef.current = { dayIndex: liveDayIndex, startMinutes: liveStartMinutes };
  }

  // ── Window-level listeners for move drag ─────────────────────────
  // Attaching pointermove/pointerup to `window` instead of the event
  // button guarantees the drag ends cleanly even when the pointer leaves
  // the element, the browser steals focus, or pointer capture would have
  // been lost.  The effect fires when `moveDrag` becomes non-null and
  // cleans up when it goes back to null (or on unmount).
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

    // Prevent text selection and lock cursor while dragging.
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

  function handleEventClick(e: ReactMouseEvent<HTMLButtonElement>, event: CalendarEvent) {
    e.stopPropagation();
    if (lastDraggedEventIdRef.current === event.id) {
      lastDraggedEventIdRef.current = null;
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
        suppressClearTimeoutRef.current = null;
      }
      return;
    }
    if (e.shiftKey && onEventShiftClick) {
      onEventShiftClick(event);
      return;
    }
    onEventClick?.(event, e.currentTarget.getBoundingClientRect());
  }

  function handleResizePointerDown(
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

  // ── Window-level listeners for resize drag ───────────────────────
  // Same approach as move drag: window listeners via useEffect, plus
  // rAF throttling so we get at most one state update (and re-render)
  // per animation frame instead of one per raw pointermove event.
  const isResizeDragging = resizeDrag !== null;
  useEffect(() => {
    if (!isResizeDragging) return;

    function applyResizeMove() {
      const drag = resizeDragRef.current;
      if (!drag) return;

      const clientY = latestResizeYRef.current;
      const deltaMinutes = snapMinutes(
        ((clientY - drag.pointerStartY) / dayHeight) * MINUTES_PER_DAY
      );

      setResizeDrag((prev) => {
        if (!prev) return prev;

        if (prev.edge === "top") {
          const next = clamp(
            prev.originalStartMinutes + deltaMinutes,
            0,
            prev.originalEndMinutes - MIN_DURATION_MINUTES
          );
          return next === prev.liveStartMinutes ? prev : { ...prev, liveStartMinutes: next };
        }

        const next = clamp(
          prev.originalEndMinutes + deltaMinutes,
          prev.originalStartMinutes + MIN_DURATION_MINUTES,
          MINUTES_PER_DAY
        );
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

  // ── Create-drag ────────────────────────────────────────────────────
  function handleSlotPointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    dayIndex: number,
    day: Date
  ) {
    if (!onSlotDragCreate || e.button !== 0 || moveDrag || resizeDrag) return;
    const minutes = clamp(snapMinutes(clientYToMinutes(e.clientY)), 0, MINUTES_PER_DAY);
    setCreateDrag({
      dayIndex,
      day,
      anchorMinutes: minutes,
      liveMinutes: minutes,
      pointerStartY: e.clientY,
      moved: false,
    });
  }

  const isCreateDragging = createDrag !== null;
  useEffect(() => {
    if (!isCreateDragging) return;

    function onPointerMove(e: PointerEvent) {
      const drag = createDragRef.current;
      if (!drag) return;
      const minutes = clamp(snapMinutes(clientYToMinutes(e.clientY)), 0, MINUTES_PER_DAY);
      const moved = drag.moved || Math.abs(e.clientY - drag.pointerStartY) >= DRAG_THRESHOLD_PX;
      setCreateDrag((prev) =>
        prev && (prev.liveMinutes !== minutes || prev.moved !== moved)
          ? { ...prev, liveMinutes: minutes, moved }
          : prev
      );
    }

    function onPointerUp() {
      const drag = createDragRef.current;
      setCreateDrag(null);
      if (!drag || !drag.moved) return;

      // A real drag happened: suppress the trailing click's day-select and
      // open the creator for the spanned range (min 15 min).
      suppressSlotClickRef.current = true;
      const lo = Math.min(drag.anchorMinutes, drag.liveMinutes);
      const hi = Math.max(lo + MIN_DURATION_MINUTES, Math.max(drag.anchorMinutes, drag.liveMinutes));
      const dayStart = startOfDay(drag.day);
      const columnEl = gridRef.current?.children[drag.dayIndex] as HTMLElement | undefined;
      const rect =
        columnEl?.getBoundingClientRect() ?? gridRef.current?.getBoundingClientRect();
      if (rect) {
        onSlotDragCreateRef.current?.(
          addMinutes(dayStart, lo),
          addMinutes(dayStart, hi),
          rect
        );
      }
    }

    function onCancel() {
      setCreateDrag(null);
    }

    const previousBodyStyle = lockBodyForDrag("ns-resize");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);

    return () => {
      restoreBodyAfterDrag(previousBodyStyle);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
    };
  });

  const draggedEvent = moveDrag?.moved ? moveDrag.event : undefined;

  return (
    <div className="flex select-none">
      {/* Hour labels — border-r connects to the column grid's left edge */}
      <div className="relative w-10 shrink-0 border-r border-border sm:w-16">
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{ height: hourHeight }}
            className="pr-1.5 text-right text-[9px] text-muted-foreground sm:pr-3 sm:text-[10px]"
          >
            <span className="relative -top-2 block truncate">{formatHourLabel(hour)}</span>
          </div>
        ))}
        {/* Current-time label, aligned with the red "now" line in the columns. */}
        {showNow && (
          <div
            className="pointer-events-none absolute right-1 z-10 -translate-y-1/2 rounded bg-red-500 px-1 py-px text-[9px] font-semibold text-white tabular-nums sm:right-1.5 sm:text-[10px]"
            style={{ top: nowOffsetPx }}
          >
            {format(now, "h:mm")}
          </div>
        )}
      </div>
      {/* Grid: gutter's border-r provides the left edge; divide-x adds 1px
          separators between columns; border-r on the grid itself caps the
          right outer edge. No wrapper div needed. */}
      <div
        ref={gridRef}
        className="relative grid flex-1 divide-x divide-border border-r border-border"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day, dayIndex) => {
          const blocks = layoutDayEvents(day, events);
          const isToday = isSameDay(day, now);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const columnBg = isDayView
            ? "bg-card"
            : isToday
              ? "bg-primary/[0.03]"
              : isWeekend
                ? "bg-muted/30"
                : "bg-card";

          return (
            <div
              key={day.getTime()}
              className={`relative border-r border-border last:border-r-0 ${columnBg}`}
              style={{ height: dayHeight }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => handleSlotPointerDown(e, dayIndex, day)}
                  onClick={() => {
                    if (suppressSlotClickRef.current) {
                      suppressSlotClickRef.current = false;
                      return;
                    }
                    onSlotSelect?.(day);
                  }}
                  onDoubleClick={(e) =>
                    onSlotCreate?.(day, hour, e.currentTarget.getBoundingClientRect())
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSlotContextMenu?.(day, hour, e.clientX, e.clientY);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSlotSelect?.(day);
                    }
                  }}
                  style={{ height: hourHeight }}
                  className="border-b border-border/40"
                />
              ))}

              {isToday && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex -translate-y-1/2 items-center"
                  style={{ top: nowOffsetPx }}
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div className="h-[2px] flex-1 bg-red-500" />
                </div>
              )}

              {/* Create-drag preview: the block the pointer is currently
                  sketching out, before the creator opens. */}
              {createDrag?.moved && createDrag.dayIndex === dayIndex && (() => {
                const lo = Math.min(createDrag.anchorMinutes, createDrag.liveMinutes);
                const hi = Math.max(
                  lo + MIN_DURATION_MINUTES,
                  Math.max(createDrag.anchorMinutes, createDrag.liveMinutes)
                );
                return (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 flex items-start overflow-hidden rounded-md border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                    style={{
                      top: `${(lo / MINUTES_PER_DAY) * 100}%`,
                      height: `${((hi - lo) / MINUTES_PER_DAY) * 100}%`,
                    }}
                  >
                    {format(addMinutes(startOfDay(day), lo), "h:mm")} – {format(addMinutes(startOfDay(day), hi), "h:mm")}
                  </div>
                );
              })()}

              {/* Persistent selection box for a drag-create whose popover is
                  still open. Same visual treatment as the live preview
                  above, but keyed off `pendingRange` (state in Calendar)
                  instead of the in-progress drag, so it survives the drag
                  ending and only clears when the popover closes. */}
              {pendingRange && isSameDay(pendingRange.start, day) && (() => {
                const startMinutes = minutesFromMidnight(pendingRange.start);
                const endMinutes =
                  startMinutes +
                  (pendingRange.end.getTime() - pendingRange.start.getTime()) / 60_000;
                return (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 flex items-start overflow-hidden rounded-md border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                    style={{
                      top: `${(startMinutes / MINUTES_PER_DAY) * 100}%`,
                      height: `${((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100}%`,
                    }}
                  >
                    {format(pendingRange.start, "h:mm")} – {format(pendingRange.end, "h:mm")}
                  </div>
                );
              })()}

              {blocks.map(({ event, top, height, left, width }) => {
                const isBeingDragged = moveDrag?.moved && moveDrag.event.id === event.id;
                const isResizing = resizeDrag?.eventId === event.id;
                const displayTop = isResizing
                  ? (resizeDrag.liveStartMinutes / MINUTES_PER_DAY) * 100
                  : top;
                const displayHeight = isResizing
                  ? ((resizeDrag.liveEndMinutes - resizeDrag.liveStartMinutes) / MINUTES_PER_DAY) * 100
                  : height;
                // Below this block height there's only room for the title and
                // time range; the location line would run into the border.
                const showLocation = Boolean(event.location) && height >= (45 / MINUTES_PER_DAY) * 100;

                // Floating inset accent bar: a solid rounded bar of the event's
                // color, inset from the left edge (see the span below). The
                // block keeps its soft tint fill + hue border; the bar adds a
                // stronger color cue without touching the edges.
                const displayColor = resolveDisplayColor(
                  event.color,
                  event.category_id,
                  event.color_overridden,
                  categories
                );
                const accentBarClass = isEventColor(displayColor)
                  ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
                  : "bg-muted-foreground/40";

                return (
                  <button
                    key={event.id}
                    type="button"
                    title={event.location ? `${event.title} (${event.location})` : event.title}
                    onPointerDown={(e) => handleMovePointerDown(e, event, dayIndex, day)}
                    onClick={(e) => handleEventClick(e, event)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEventContextMenu?.(event, e.clientX, e.clientY);
                    }}
                    style={{
                      top: `${displayTop}%`,
                      height: `${displayHeight}%`,
                      left: `calc(${left}% + 5px)`,
                      width: `calc(${width}% - 10px)`,
                    }}
                    className={`absolute overflow-hidden rounded-sm border text-left text-xs font-semibold ${onEventMove ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${isBeingDragged ? "opacity-30" : ""} ${selectedEventIds?.has(event.id) ? "ring-2 ring-primary ring-offset-1" : ""} ${getEventColorClasses(displayColor)}`}
                  >
                    {/* Floating inset accent bar, hugging the left edge. */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-1 top-1 bottom-1 w-[3px] rounded-full ${accentBarClass}`}
                    />
                    {/* Absolutely positioned (not just first in flow) so the
                     *  title always sits at the block's top-left corner —
                     *  including in a MIN_BLOCK_HEIGHT_PERCENT-clamped short
                     *  event, where flow content could otherwise center or
                     *  drift within the padded box. Left inset clears the bar. */}
                    <span className="absolute left-[13px] right-1.5 top-0.5 truncate">
                      {event.icon && <span className="mr-1">{event.icon}</span>}
                      {event.title}
                    </span>
                    <span className="absolute left-[13px] right-1.5 top-5 truncate text-[11px] font-medium opacity-90">
                      {format(new Date(event.start_at), "h:mm")} – {format(new Date(event.end_at), "h:mm")}
                    </span>
                    {showLocation && (
                      <span className="absolute left-[13px] right-1.5 top-9 truncate text-[11px] font-medium opacity-70">
                        {event.location}
                      </span>
                    )}

                    {onEventResize && !moveDrag?.moved && (
                      <>
                        <div
                          onPointerDown={(e) => handleResizePointerDown(e, "top", event, day, top, height)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-x-0 top-0 h-1.5 touch-none cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => handleResizePointerDown(e, "bottom", event, day, top, height)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-x-0 bottom-0 h-1.5 touch-none cursor-ns-resize"
                        />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {draggedEvent && moveDrag && (
          <div
            ref={ghostRef}
            // All four dimensions are px, fixed at the block's pre-drag
            // position — applyPointerMove moves the ghost purely via
            // `transform`, written directly to this node on every pointer
            // move so it tracks the cursor without SNAP_MINUTES stepping.
            //
            // left/width use the column's pixel metrics captured at pickup
            // (originColumnLeft/columnWidth), so they stay correct even
            // with the border-based column separators — percentage-based
            // positioning would drift once any border width was included.
            className={`pointer-events-none absolute z-20 overflow-hidden rounded-[6px] text-left text-[11px] font-medium shadow-lg ${getEventColorClasses(resolveDisplayColor(draggedEvent.color, draggedEvent.category_id, draggedEvent.color_overridden, categories))}`}
            style={{
              left: moveDrag.originColumnLeft,
              width: moveDrag.columnWidth,
              top: (moveDrag.originalStartMinutes / MINUTES_PER_DAY) * dayHeight,
              height: (moveDrag.durationMinutes / MINUTES_PER_DAY) * dayHeight,
              transform: "translate3d(0, 0, 0)",
            }}
          >
            {/* Same top-left-pinned title treatment as the real block above,
             *  so the name doesn't drift within the ghost either. */}
            <span className="absolute inset-x-1.5 top-0.5 truncate">
              {draggedEvent.icon && <span className="mr-1">{draggedEvent.icon}</span>}
              {draggedEvent.title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
