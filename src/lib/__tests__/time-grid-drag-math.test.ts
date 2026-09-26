import { describe, expect, it } from "bun:test";
import {
  DRAG_THRESHOLD_PX,
  MIN_DURATION_MINUTES,
  MINUTES_PER_DAY,
  SNAP_MINUTES,
  clamp,
  computeCreateRange,
  computeDayIndexFromX,
  computeGhostDelta,
  computeMoveStartMinutes,
  computeResizeEdgeMinutes,
  minutesFromMidnight,
  passedDragThreshold,
  pointerToMinutes,
  snapMinutes,
} from "../time-grid-drag-math";

// A week-view sized grid used across tests: 24h * 64px rows = 1536px tall,
// 7 columns. Gap math is exercised separately.
const DAY_HEIGHT = 24 * 64; // 1536

describe("constants", () => {
  it("holds the drag tuning values TimeGrid depends on", () => {
    expect(SNAP_MINUTES).toBe(15);
    expect(MIN_DURATION_MINUTES).toBe(15);
    expect(DRAG_THRESHOLD_PX).toBe(4);
    expect(MINUTES_PER_DAY).toBe(1440);
  });
});

describe("minutesFromMidnight", () => {
  it("converts a local time to minutes past midnight", () => {
    expect(minutesFromMidnight(new Date(2030, 0, 1, 0, 0))).toBe(0);
    expect(minutesFromMidnight(new Date(2030, 0, 1, 9, 30))).toBe(570);
    expect(minutesFromMidnight(new Date(2030, 0, 1, 23, 59))).toBe(1439);
  });
});

describe("snapMinutes", () => {
  it("rounds to the nearest 15-minute mark", () => {
    expect(snapMinutes(0)).toBe(0);
    expect(snapMinutes(7)).toBe(0); // rounds down (<7.5)
    expect(snapMinutes(8)).toBe(15); // rounds up
    expect(snapMinutes(22)).toBe(15);
    expect(snapMinutes(23)).toBe(30);
    expect(snapMinutes(600)).toBe(600);
  });
});

describe("clamp", () => {
  it("constrains to the inclusive range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("pointerToMinutes", () => {
  it("maps a clientY within the grid to minutes, relative to the grid top", () => {
    // Grid top at y=100. Half way down a 1536px day = 12h = 720min.
    expect(pointerToMinutes(100 + DAY_HEIGHT / 2, 100, DAY_HEIGHT)).toBe(720);
    // At the very top of the grid = midnight.
    expect(pointerToMinutes(100, 100, DAY_HEIGHT)).toBe(0);
  });

  it("does not clamp: a pointer above the grid yields negative minutes", () => {
    expect(pointerToMinutes(36, 100, DAY_HEIGHT)).toBeCloseTo(-60, 5);
  });
});

describe("passedDragThreshold", () => {
  it("is false below the threshold and true at or beyond it", () => {
    expect(passedDragThreshold(0, 0)).toBe(false);
    expect(passedDragThreshold(3, 0)).toBe(false); // 3px < 4px
    expect(passedDragThreshold(4, 0)).toBe(true);
    expect(passedDragThreshold(3, 3)).toBe(true); // hypot ~4.24 >= 4
  });
});

describe("computeMoveStartMinutes", () => {
  const gridTop = 0;
  it("drops at the snapped time under the pointer, minus the grab offset", () => {
    // Pointer at 9:07 (547min), grabbed 30min below the block top -> raw 517,
    // snapped to 510 (8:30).
    const clientY = (547 / MINUTES_PER_DAY) * DAY_HEIGHT;
    expect(
      computeMoveStartMinutes({
        clientY,
        gridTop,
        dayHeight: DAY_HEIGHT,
        grabOffsetMinutes: 30,
        durationMinutes: 60,
      })
    ).toBe(510);
  });

  it("clamps so the whole event stays within the day", () => {
    // Pointer far past the bottom, 60min event -> latest start is 1440-60=1380.
    const clientY = DAY_HEIGHT * 2;
    expect(
      computeMoveStartMinutes({
        clientY,
        gridTop,
        dayHeight: DAY_HEIGHT,
        grabOffsetMinutes: 0,
        durationMinutes: 60,
      })
    ).toBe(MINUTES_PER_DAY - 60);
  });

  it("clamps to 0 at the top", () => {
    expect(
      computeMoveStartMinutes({
        clientY: -500,
        gridTop,
        dayHeight: DAY_HEIGHT,
        grabOffsetMinutes: 0,
        durationMinutes: 60,
      })
    ).toBe(0);
  });
});

describe("computeDayIndexFromX", () => {
  // 7 columns, 700px wide grid, no gap -> 100px columns.
  const base = { gridLeft: 0, gridWidth: 700, columnWidth: 100, dayCount: 7 };

  it("returns the column under the pointer", () => {
    expect(computeDayIndexFromX({ ...base, clientX: 50 })).toBe(0);
    expect(computeDayIndexFromX({ ...base, clientX: 250 })).toBe(2);
    expect(computeDayIndexFromX({ ...base, clientX: 650 })).toBe(6);
  });

  it("clamps to the first and last column outside the grid", () => {
    expect(computeDayIndexFromX({ ...base, clientX: -20 })).toBe(0);
    expect(computeDayIndexFromX({ ...base, clientX: 9999 })).toBe(6);
  });

  it("accounts for the gap between columns", () => {
    // 7 * 90px columns + 6 * gap = 700 -> gap ~16.67, step ~106.67.
    // x=110 lands in column 1 (0..106.67 is col 0, 106.67..213.3 is col 1).
    expect(
      computeDayIndexFromX({ clientX: 110, gridLeft: 0, gridWidth: 700, columnWidth: 90, dayCount: 7 })
    ).toBe(1);
  });

  it("returns 0 for a degenerate zero-width column", () => {
    expect(computeDayIndexFromX({ ...base, columnWidth: 0, clientX: 300 })).toBe(0);
  });

  it("handles a single-column (day view) grid", () => {
    expect(
      computeDayIndexFromX({ clientX: 40, gridLeft: 0, gridWidth: 200, columnWidth: 200, dayCount: 1 })
    ).toBe(0);
  });
});

describe("computeGhostDelta", () => {
  const geo = {
    gridWidth: 700,
    columnWidth: 100,
    originColumnLeft: 200, // block starts in column 2
    originalStartMinutes: 540, // 9:00
    durationMinutes: 60,
    dayHeight: DAY_HEIGHT,
  };

  it("passes small deltas through unchanged", () => {
    expect(computeGhostDelta({ ...geo, deltaX: 30, deltaY: 20 })).toEqual({ x: 30, y: 20 });
  });

  it("clamps horizontal travel to the grid edges", () => {
    // Left: can't move past -originColumnLeft (-200).
    expect(computeGhostDelta({ ...geo, deltaX: -500, deltaY: 0 }).x).toBe(-200);
    // Right: gridWidth - columnWidth - originColumnLeft = 700-100-200 = 400.
    expect(computeGhostDelta({ ...geo, deltaX: 5000, deltaY: 0 }).x).toBe(400);
  });

  it("clamps vertical travel so the block stays inside the day", () => {
    const originalTopPx = (540 / MINUTES_PER_DAY) * DAY_HEIGHT; // 576
    const durationPx = (60 / MINUTES_PER_DAY) * DAY_HEIGHT; // 64
    // Up: -originalTopPx. Down: dayHeight - durationPx - originalTopPx.
    expect(computeGhostDelta({ ...geo, deltaX: 0, deltaY: -9999 }).y).toBe(-originalTopPx);
    expect(computeGhostDelta({ ...geo, deltaX: 0, deltaY: 9999 }).y).toBe(
      DAY_HEIGHT - durationPx - originalTopPx
    );
  });
});

describe("computeResizeEdgeMinutes", () => {
  const anchor = { originalStartMinutes: 540, originalEndMinutes: 600, dayHeight: DAY_HEIGHT };

  it("moves the top edge up by the snapped delta", () => {
    // Drag up 64px = -60min -> start 540 -> 480.
    expect(computeResizeEdgeMinutes({ edge: "top", pointerDeltaY: -64, ...anchor })).toBe(480);
  });

  it("stops the top edge one MIN_DURATION above the end", () => {
    // Drag the top way down: clamped to end - 15 = 585.
    expect(computeResizeEdgeMinutes({ edge: "top", pointerDeltaY: 5000, ...anchor })).toBe(585);
  });

  it("moves the bottom edge down by the snapped delta", () => {
    // Drag down 64px = +60min -> end 600 -> 660.
    expect(computeResizeEdgeMinutes({ edge: "bottom", pointerDeltaY: 64, ...anchor })).toBe(660);
  });

  it("stops the bottom edge one MIN_DURATION below the start", () => {
    expect(computeResizeEdgeMinutes({ edge: "bottom", pointerDeltaY: -5000, ...anchor })).toBe(
      540 + MIN_DURATION_MINUTES
    );
  });

  it("clamps the bottom edge to the end of the day", () => {
    const lateAnchor = { originalStartMinutes: 1380, originalEndMinutes: 1410, dayHeight: DAY_HEIGHT };
    expect(computeResizeEdgeMinutes({ edge: "bottom", pointerDeltaY: 9999, ...lateAnchor })).toBe(
      MINUTES_PER_DAY
    );
  });
});

describe("computeCreateRange", () => {
  it("orders anchor and live into [lo, hi]", () => {
    expect(computeCreateRange(600, 720)).toEqual({ lo: 600, hi: 720 });
    expect(computeCreateRange(720, 600)).toEqual({ lo: 600, hi: 720 });
  });

  it("enforces the minimum duration for a tiny or zero drag", () => {
    expect(computeCreateRange(600, 600)).toEqual({ lo: 600, hi: 615 });
    expect(computeCreateRange(600, 605)).toEqual({ lo: 600, hi: 615 });
  });

  it("keeps a range already longer than the minimum", () => {
    expect(computeCreateRange(600, 900)).toEqual({ lo: 600, hi: 900 });
  });
});
