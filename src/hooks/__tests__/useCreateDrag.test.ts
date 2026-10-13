import { describe, expect, it } from "bun:test";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { renderHook } from "@/test-utils/render-hook";
import { useCreateDrag } from "../useCreateDrag";

const DAY = new Date(2026, 9, 1);

globalThis.DOMRect ??= class {
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
} as unknown as typeof DOMRect;

const grid = {
  current: {
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 700, height: 2400 }),
    querySelector: () => null,
  },
} as unknown as RefObject<HTMLDivElement | null>;

function pointerDown(button: number, clientY: number) {
  return { button, clientX: 10, clientY } as unknown as ReactPointerEvent<HTMLDivElement>;
}

function fireWindow(type: string, clientY: number) {
  const WindowEvent = (window as unknown as { Event: typeof Event }).Event;
  window.dispatchEvent(Object.assign(new WindowEvent(type), { clientX: 10, clientY }));
}

function renderCreateDrag() {
  const created: [Date, Date][] = [];
  const hook = renderHook(() =>
    useCreateDrag({
      gridRef: grid,
      dayHeight: 2400,
      onSlotDragCreate: (start, end) => created.push([start, end]),
      blocked: false,
    })
  );
  return { ...hook, created };
}

async function dragAcrossSlots(hook: ReturnType<typeof renderCreateDrag>) {
  await hook.act(() => {});
  await hook.act(() => hook.result.current.onSlotPointerDown(pointerDown(0, 100), 0, DAY));
  await hook.act(() => fireWindow("pointermove", 400));
  await hook.act(() => fireWindow("pointerup", 400));
}

describe("useCreateDrag", () => {
  it("swallows the click that trails a completed drag", async () => {
    const hook = renderCreateDrag();
    await dragAcrossSlots(hook);

    expect(hook.created).toHaveLength(1);
    expect(hook.result.current.consumeSlotClickSuppression()).toBe(true);
  });

  it("lets a later slot click through when the trailing click missed the slot", async () => {
    const hook = renderCreateDrag();
    await dragAcrossSlots(hook);
    await new Promise((r) => setTimeout(r, 500));

    expect(hook.created).toHaveLength(1);
    expect(hook.result.current.consumeSlotClickSuppression()).toBe(false);
  });

  it("ignores a right-button press", async () => {
    const hook = renderCreateDrag();
    await hook.act(() => {});
    await hook.act(() => hook.result.current.onSlotPointerDown(pointerDown(2, 100), 0, DAY));

    expect(hook.result.current.preview).toBeNull();
  });
});
