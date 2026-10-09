import { describe, expect, it } from "bun:test";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { renderHook } from "@/test-utils/render-hook";
import { nextGridSlot, useGridFocus, type GridSlot } from "../useGridFocus";

const WEEK = { dayCount: 7, hourCount: 24 };

function key(k: string, mods: { shiftKey?: boolean } = {}) {
  let prevented = false;
  const e = {
    key: k,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...mods,
    preventDefault: () => {
      prevented = true;
    },
  };
  return { e: e as unknown as ReactKeyboardEvent, wasPrevented: () => prevented };
}

describe("nextGridSlot", () => {
  it("moves one hour with ArrowUp and ArrowDown", () => {
    expect(nextGridSlot({ dayIndex: 2, hour: 9 }, "ArrowDown", WEEK)).toEqual({ dayIndex: 2, hour: 10 });
    expect(nextGridSlot({ dayIndex: 2, hour: 9 }, "ArrowUp", WEEK)).toEqual({ dayIndex: 2, hour: 8 });
  });

  it("stays on hour 23 for ArrowDown and hour 0 for ArrowUp", () => {
    expect(nextGridSlot({ dayIndex: 2, hour: 23 }, "ArrowDown", WEEK)).toEqual({ dayIndex: 2, hour: 23 });
    expect(nextGridSlot({ dayIndex: 2, hour: 0 }, "ArrowUp", WEEK)).toEqual({ dayIndex: 2, hour: 0 });
  });

  it("moves one day with ArrowLeft and ArrowRight and stops at the edges", () => {
    expect(nextGridSlot({ dayIndex: 3, hour: 14 }, "ArrowRight", WEEK)).toEqual({ dayIndex: 4, hour: 14 });
    expect(nextGridSlot({ dayIndex: 6, hour: 14 }, "ArrowRight", WEEK)).toEqual({ dayIndex: 6, hour: 14 });
    expect(nextGridSlot({ dayIndex: 0, hour: 14 }, "ArrowLeft", WEEK)).toEqual({ dayIndex: 0, hour: 14 });
  });

  it("jumps to the first and last hour of the day with Home and End", () => {
    expect(nextGridSlot({ dayIndex: 4, hour: 14 }, "Home", WEEK)).toEqual({ dayIndex: 4, hour: 0 });
    expect(nextGridSlot({ dayIndex: 4, hour: 14 }, "End", WEEK)).toEqual({ dayIndex: 4, hour: 23 });
  });

  it("keeps a one-day grid on its only column", () => {
    const day = { dayCount: 1, hourCount: 24 };
    expect(nextGridSlot({ dayIndex: 0, hour: 5 }, "ArrowRight", day)).toEqual({ dayIndex: 0, hour: 5 });
  });

  it("ignores keys that are not navigation keys", () => {
    expect(nextGridSlot({ dayIndex: 0, hour: 5 }, "Enter", WEEK)).toBeNull();
    expect(nextGridSlot({ dayIndex: 0, hour: 5 }, "a", WEEK)).toBeNull();
  });
});

describe("useGridFocus", () => {
  it("puts only the focused slot in the tab order", async () => {
    const { result, act, unmount } = renderHook(() => useGridFocus({ ...WEEK, initial: { dayIndex: 1, hour: 8 } }));
    await act(() => {});
    expect(result.current.tabIndexFor({ dayIndex: 1, hour: 8 })).toBe(0);
    expect(result.current.tabIndexFor({ dayIndex: 1, hour: 9 })).toBe(-1);
    expect(result.current.tabIndexFor({ dayIndex: 0, hour: 8 })).toBe(-1);
    unmount();
  });

  it("moves the roving slot and focus on ArrowDown, and swallows the key", async () => {
    const focusedCalls: GridSlot[] = [];
    const { result, act, unmount } = renderHook(() =>
      useGridFocus({ ...WEEK, initial: { dayIndex: 4, hour: 14 }, focusSlot: (s) => focusedCalls.push(s) })
    );
    await act(() => {});
    const k = key("ArrowDown");
    let handled = false;
    await act(() => {
      handled = result.current.onKeyDown(k.e, { dayIndex: 4, hour: 14 });
    });
    expect(handled).toBe(true);
    expect(k.wasPrevented()).toBe(true);
    expect(result.current.focused).toEqual({ dayIndex: 4, hour: 15 });
    expect(result.current.tabIndexFor({ dayIndex: 4, hour: 15 })).toBe(0);
    expect(focusedCalls).toEqual([{ dayIndex: 4, hour: 15 }]);
    unmount();
  });

  it("stays at hour 23 on ArrowDown there", async () => {
    const { result, act, unmount } = renderHook(() =>
      useGridFocus({ ...WEEK, initial: { dayIndex: 0, hour: 23 } })
    );
    await act(() => {});
    await act(() => {
      result.current.onKeyDown(key("ArrowDown").e, { dayIndex: 0, hour: 23 });
    });
    expect(result.current.focused).toEqual({ dayIndex: 0, hour: 23 });
    unmount();
  });

  it("stays on the last day on ArrowRight there", async () => {
    const { result, act, unmount } = renderHook(() =>
      useGridFocus({ ...WEEK, initial: { dayIndex: 6, hour: 9 } })
    );
    await act(() => {});
    await act(() => {
      result.current.onKeyDown(key("ArrowRight").e, { dayIndex: 6, hour: 9 });
    });
    expect(result.current.focused).toEqual({ dayIndex: 6, hour: 9 });
    unmount();
  });

  it("handles Home and End", async () => {
    const { result, act, unmount } = renderHook(() =>
      useGridFocus({ ...WEEK, initial: { dayIndex: 2, hour: 9 } })
    );
    await act(() => {});
    await act(() => {
      result.current.onKeyDown(key("End").e, { dayIndex: 2, hour: 9 });
    });
    expect(result.current.focused).toEqual({ dayIndex: 2, hour: 23 });
    await act(() => {
      result.current.onKeyDown(key("Home").e, { dayIndex: 2, hour: 23 });
    });
    expect(result.current.focused).toEqual({ dayIndex: 2, hour: 0 });
    unmount();
  });

  it("leaves modified keys and non-navigation keys to the caller", async () => {
    const { result, act, unmount } = renderHook(() =>
      useGridFocus({ ...WEEK, initial: { dayIndex: 2, hour: 9 } })
    );
    await act(() => {});
    const shifted = key("ArrowDown", { shiftKey: true });
    const enter = key("Enter");
    let handledShift = true;
    let handledEnter = true;
    await act(() => {
      handledShift = result.current.onKeyDown(shifted.e, { dayIndex: 2, hour: 9 });
      handledEnter = result.current.onKeyDown(enter.e, { dayIndex: 2, hour: 9 });
    });
    expect(handledShift).toBe(false);
    expect(handledEnter).toBe(false);
    expect(shifted.wasPrevented()).toBe(false);
    expect(result.current.focused).toEqual({ dayIndex: 2, hour: 9 });
    unmount();
  });

  it("records focus that arrives from a click", async () => {
    const { result, act, unmount } = renderHook(() =>
      useGridFocus({ ...WEEK, initial: { dayIndex: 0, hour: 8 } })
    );
    await act(() => {});
    await act(() => result.current.setFocused({ dayIndex: 5, hour: 3 }));
    expect(result.current.tabIndexFor({ dayIndex: 5, hour: 3 })).toBe(0);
    unmount();
  });
});
