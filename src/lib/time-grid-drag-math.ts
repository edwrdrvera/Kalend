/**
 * Pure geometry for the TimeGrid drag gestures (move / resize / create).
 *
 * Everything here is a plain function of numbers and Dates: no React, no DOM,
 * no refs. TimeGrid's gesture hooks own the imperative shell (pointer events,
 * window listeners, rAF, body-lock) and call into these to decide *where* a
 * drag lands. Keeping the decisions pure is what makes the drag behaviour
 * unit-testable without mounting the grid and synthesising pointer events.
 *
 * The formulas here are lifted verbatim from the original inline TimeGrid
 * implementation; the accompanying tests pin them so the extraction can be
 * proven behaviour-preserving.
 */

/** Drags snap the time to this increment (minutes). */
export const SNAP_MINUTES = 15;
/** Shortest event a resize or create drag can produce (minutes). */
export const MIN_DURATION_MINUTES = 15;
/**
 * A press has to travel this many pixels before it counts as a drag rather
 * than a click (which selects the day / opens the edit popover instead).
 */
export const DRAG_THRESHOLD_PX = 4;
export const MINUTES_PER_DAY = 24 * 60;

/** Minutes since local midnight for a given Date. */
export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Round a minute value to the nearest SNAP_MINUTES mark. */
export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/** Constrain `value` to the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert a viewport clientY into minutes-from-midnight within the grid, where
 * `gridTop` is the grid's top edge (getBoundingClientRect().top) and
 * `dayHeight` is the full 24-hour column height in px. Not clamped: callers
 * decide the valid range for their gesture.
 */
export function pointerToMinutes(clientY: number, gridTop: number, dayHeight: number): number {
  return ((clientY - gridTop) / dayHeight) * MINUTES_PER_DAY;
}

/**
 * True once a press has travelled far enough to count as a drag. `dx`/`dy` are
 * the pointer's total displacement from where it went down. Move-drag uses the
 * Euclidean distance so travel in any direction can start the drag.
 */
export function passedDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
}

/**
 * The snapped start-minute a move-drag would drop at: the absolute time under
 * the pointer minus the fixed grab offset (so the block doesn't jump to be
 * centred on the cursor), snapped, then clamped so the whole event stays inside
 * the day.
 */
export function computeMoveStartMinutes(params: {
  clientY: number;
  gridTop: number;
  dayHeight: number;
  grabOffsetMinutes: number;
  durationMinutes: number;
}): number {
  const { clientY, gridTop, dayHeight, grabOffsetMinutes, durationMinutes } = params;
  return clamp(
    snapMinutes(pointerToMinutes(clientY, gridTop, dayHeight) - grabOffsetMinutes),
    0,
    MINUTES_PER_DAY - durationMinutes
  );
}

/**
 * Which day column the pointer is over, accounting for the CSS grid gap between
 * columns. `columnWidth` is one column's px width (captured at pickup);
 * `gridLeft`/`gridWidth` come from the grid's bounding rect. Returns a valid
 * index in [0, dayCount - 1].
 */
export function computeDayIndexFromX(params: {
  clientX: number;
  gridLeft: number;
  gridWidth: number;
  columnWidth: number;
  dayCount: number;
}): number {
  const { clientX, gridLeft, gridWidth, columnWidth, dayCount } = params;
  if (columnWidth <= 0) return 0;
  const gapSize = dayCount > 1 ? (gridWidth - dayCount * columnWidth) / (dayCount - 1) : 0;
  const stepSize = columnWidth + gapSize;
  const relX = clientX - gridLeft;
  return Math.min(dayCount - 1, Math.max(0, Math.floor(relX / stepSize)));
}

/**
 * Pixel translation for the drag ghost, clamped so the ghost can't leave the
 * grid. `deltaX`/`deltaY` are the raw pointer displacement; the block's origin
 * (originColumnLeft, originalStartMinutes) and duration bound the travel. The
 * ghost tracks the pointer 1:1 (not the snapped position) so it never visibly
 * steps behind the cursor.
 */
export function computeGhostDelta(params: {
  deltaX: number;
  deltaY: number;
  gridWidth: number;
  columnWidth: number;
  originColumnLeft: number;
  originalStartMinutes: number;
  durationMinutes: number;
  dayHeight: number;
}): { x: number; y: number } {
  const {
    deltaX,
    deltaY,
    gridWidth,
    columnWidth,
    originColumnLeft,
    originalStartMinutes,
    durationMinutes,
    dayHeight,
  } = params;
  const durationPx = (durationMinutes / MINUTES_PER_DAY) * dayHeight;
  const originalTopPx = (originalStartMinutes / MINUTES_PER_DAY) * dayHeight;
  return {
    x: clamp(deltaX, -originColumnLeft, gridWidth - columnWidth - originColumnLeft),
    y: clamp(deltaY, -originalTopPx, dayHeight - durationPx - originalTopPx),
  };
}

/**
 * The new edge minute a resize-drag would land at. `pointerDeltaY` is the
 * pointer's vertical travel since pickup; it's converted to minutes and snapped,
 * then applied to the dragged edge and clamped against the opposite edge so the
 * event keeps at least MIN_DURATION_MINUTES. Returns the new start (top edge) or
 * the new end (bottom edge).
 */
export function computeResizeEdgeMinutes(params: {
  edge: "top" | "bottom";
  pointerDeltaY: number;
  originalStartMinutes: number;
  originalEndMinutes: number;
  dayHeight: number;
}): number {
  const { edge, pointerDeltaY, originalStartMinutes, originalEndMinutes, dayHeight } = params;
  const deltaMinutes = snapMinutes((pointerDeltaY / dayHeight) * MINUTES_PER_DAY);
  if (edge === "top") {
    return clamp(
      originalStartMinutes + deltaMinutes,
      0,
      originalEndMinutes - MIN_DURATION_MINUTES
    );
  }
  return clamp(
    originalEndMinutes + deltaMinutes,
    originalStartMinutes + MIN_DURATION_MINUTES,
    MINUTES_PER_DAY
  );
}

/**
 * Normalise a create-drag's anchor and live minutes into an ordered
 * [lo, hi] range that is at least MIN_DURATION_MINUTES tall, regardless of drag
 * direction.
 */
export function computeCreateRange(anchorMinutes: number, liveMinutes: number): { lo: number; hi: number } {
  const lo = Math.min(anchorMinutes, liveMinutes);
  const hi = Math.max(lo + MIN_DURATION_MINUTES, Math.max(anchorMinutes, liveMinutes));
  return { lo, hi };
}
