import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

/** One focusable slot in a grid: a day column and an hour row. */
export interface GridSlot {
  dayIndex: number;
  hour: number;
}

export interface GridBounds {
  dayCount: number;
  hourCount: number;
}

/** Where a navigation key moves from `from`, or `null` when the key is not a
 *  navigation key. The grid does not wrap: a move past an edge stays put.
 *  Home and End jump to the first and last hour of the current day. */
export function nextGridSlot(from: GridSlot, key: string, bounds: GridBounds): GridSlot | null {
  const lastDay = bounds.dayCount - 1;
  const lastHour = bounds.hourCount - 1;
  switch (key) {
    case "ArrowUp":
      return { dayIndex: from.dayIndex, hour: Math.max(0, from.hour - 1) };
    case "ArrowDown":
      return { dayIndex: from.dayIndex, hour: Math.min(lastHour, from.hour + 1) };
    case "ArrowLeft":
      return { dayIndex: Math.max(0, from.dayIndex - 1), hour: from.hour };
    case "ArrowRight":
      return { dayIndex: Math.min(lastDay, from.dayIndex + 1), hour: from.hour };
    case "Home":
      return { dayIndex: from.dayIndex, hour: 0 };
    case "End":
      return { dayIndex: from.dayIndex, hour: lastHour };
    default:
      return null;
  }
}

interface UseGridFocusParams extends GridBounds {
  initial: GridSlot;
  /** Moves real DOM focus onto a slot. Called after a navigation key. */
  focusSlot?: (slot: GridSlot) => void;
}

/** Roving focus for a day-by-hour grid. Exactly one slot is in the Tab order
 *  (`tabIndexFor` returns 0 for it, -1 for the rest), so Tab enters and leaves
 *  the grid in one stop and the arrow keys move inside it. Focus that arrives
 *  any other way (a mouse click) is recorded through `setFocused`. */
export function useGridFocus({ dayCount, hourCount, initial, focusSlot }: UseGridFocusParams) {
  const [focused, setFocused] = useState<GridSlot>(initial);
  const bounds = { dayCount, hourCount };

  // The visible days can shrink (week to day view); keep the roving slot inside.
  const current: GridSlot = {
    dayIndex: Math.min(focused.dayIndex, dayCount - 1),
    hour: Math.min(focused.hour, hourCount - 1),
  };

  function tabIndexFor(slot: GridSlot): 0 | -1 {
    return slot.dayIndex === current.dayIndex && slot.hour === current.hour ? 0 : -1;
  }

  /** Returns true when the key moved focus, so the caller can skip its own handling. */
  function onKeyDown(e: ReactKeyboardEvent, from: GridSlot): boolean {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    const next = nextGridSlot(from, e.key, bounds);
    if (!next) return false;
    e.preventDefault();
    setFocused(next);
    focusSlot?.(next);
    return true;
  }

  return { focused: current, setFocused, tabIndexFor, onKeyDown };
}
