import { describe, expect, it } from "bun:test";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { renderHook } from "@/test-utils/render-hook";
import type { CalendarEvent } from "@/lib/calendar-types";
import { useMoveDrag } from "../useMoveDrag";

const DAY = new Date(2026, 9, 1);
const EVENT = {
  id: "e1",
  title: "Lecture",
  start_at: "2026-10-01T10:00:00.000Z",
  end_at: "2026-10-01T11:00:00.000Z",
} as CalendarEvent;

const grid = {
  current: {
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 700, height: 2400 }),
    querySelector: () => null,
  },
} as unknown as RefObject<HTMLDivElement | null>;

function pointerDown(button: number) {
  return {
    button,
    clientX: 10,
    clientY: 100,
    stopPropagation: () => {},
  } as unknown as ReactPointerEvent<HTMLButtonElement>;
}

async function pressBlock(button: number) {
  const { result, act } = renderHook(() =>
    useMoveDrag({ gridRef: grid, dayHeight: 2400, days: [DAY], onEventMove: () => {}, blockedByResize: false })
  );
  await act(() => {});
  await act(() => result.current.onBlockPointerDown(pointerDown(button), EVENT, 0, DAY));
  return result.current;
}

describe("useMoveDrag", () => {
  it("starts a move on the primary button", async () => {
    expect((await pressBlock(0)).active).toBe(true);
  });

  it("ignores a right-button press", async () => {
    expect((await pressBlock(2)).active).toBe(false);
  });

  it("ignores a middle-button press", async () => {
    expect((await pressBlock(1)).active).toBe(false);
  });
});
