import { describe, expect, it } from "bun:test";
import type { PointerEvent as ReactPointerEvent } from "react";
import { renderHook } from "@/test-utils/render-hook";
import type { CalendarEvent } from "@/lib/calendar-types";
import { useResizeDrag } from "../useResizeDrag";

const DAY = new Date(2026, 9, 1);
const EVENT = {
  id: "e1",
  title: "Lecture",
  start_at: "2026-10-01T10:00:00.000Z",
  end_at: "2026-10-01T11:00:00.000Z",
} as CalendarEvent;

function pointerDown(button: number) {
  return {
    button,
    clientX: 10,
    clientY: 100,
    stopPropagation: () => {},
  } as unknown as ReactPointerEvent<HTMLDivElement>;
}

async function pressBottomEdge(button: number) {
  const { result, act } = renderHook(() => useResizeDrag({ dayHeight: 2400, onEventResize: () => {} }));
  await act(() => {});
  await act(() => result.current.onEdgePointerDown(pointerDown(button), "bottom", EVENT, DAY, 40, 5));
  return result.current;
}

describe("useResizeDrag", () => {
  it("starts a resize on the primary button", async () => {
    expect((await pressBottomEdge(0)).active).toBe(true);
  });

  it("ignores a right-button press", async () => {
    expect((await pressBottomEdge(2)).active).toBe(false);
  });

  it("ignores a middle-button press", async () => {
    expect((await pressBottomEdge(1)).active).toBe(false);
  });
});
