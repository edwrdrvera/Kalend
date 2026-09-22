import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarEvent } from "@/lib/calendar-types";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TimeGrid, HOUR_HEIGHT_PX } = await import("../TimeGrid");

// Behavioral pin for the drag gestures, held across the hook extraction.
// happy-dom returns zero-sized layout rects, so day-column geometry (which
// needs real widths) cannot be exercised here. The drag TIMES derive from
// clientY and the hour-row height, both real numbers, so the emit behavior of
// each gesture is testable. One 24h column is HOURS * HOUR_HEIGHT_PX px tall,
// so one hour is HOUR_HEIGHT_PX px and a 64px vertical drag is exactly 60 min.
const DAY = new Date(2030, 8, 9); // a Monday
const PX_PER_HOUR = HOUR_HEIGHT_PX; // 64

function makeEvent(): CalendarEvent {
  return {
    id: "event-1",
    title: "Biology lecture",
    start_at: new Date(2030, 8, 9, 9).toISOString(), // 09:00
    end_at: new Date(2030, 8, 9, 10).toISOString(), // 10:00
    color: "blue",
    color_overridden: true,
    category_id: null,
    location: null,
    icon: null,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

interface Handlers {
  moves: Array<{ event: CalendarEvent; start: Date; end: Date }>;
  resizes: Array<{ event: CalendarEvent; start: Date; end: Date }>;
  creates: Array<{ start: Date; end: Date }>;
}

async function renderGrid(): Promise<Handlers> {
  const handlers: Handlers = { moves: [], resizes: [], creates: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(TimeGrid, {
        days: [DAY],
        events: [makeEvent()],
        categories: [],
        onEventMove: (event, start, end) => handlers.moves.push({ event, start, end }),
        onEventResize: (event, start, end) => handlers.resizes.push({ event, start, end }),
        onSlotDragCreate: (start, end) => handlers.creates.push({ start, end }),
      })
    )
  );
  return handlers;
}

function pointer(type: string, clientY: number, target: EventTarget) {
  target.dispatchEvent(
    new PointerEvent(type, { clientX: 10, clientY, bubbles: true, button: 0 })
  );
}

// Dispatch a window-level pointer event and let the rAF-throttled handler run.
async function windowPointer(type: string, clientY: number) {
  await act(async () => {
    window.dispatchEvent(new PointerEvent(type, { clientX: 10, clientY, bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("TimeGrid move-drag", () => {
  it("fires onEventMove with the event shifted by the dragged distance", async () => {
    const handlers = await renderGrid();

    const block = document.querySelector<HTMLButtonElement>('button[title="Biology lecture"]');
    expect(block).not.toBeNull();

    // Press on the block at y=100, drag down one hour (64px), release.
    await act(async () => pointer("pointerdown", 100, block!));
    await windowPointer("pointermove", 100 + PX_PER_HOUR);
    await windowPointer("pointerup", 100 + PX_PER_HOUR);

    expect(handlers.moves.length).toBe(1);
    const { start, end } = handlers.moves[0]!;
    // 09:00 shifted down one hour is 10:00, and the 1h duration is preserved.
    expect(start.getHours()).toBe(10);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(11);
  });

  it("does not fire onEventMove for a click that never passes the drag threshold", async () => {
    const handlers = await renderGrid();
    const block = document.querySelector<HTMLButtonElement>('button[title="Biology lecture"]')!;

    await act(async () => pointer("pointerdown", 100, block));
    await windowPointer("pointermove", 102); // 2px, under the 4px threshold
    await windowPointer("pointerup", 102);

    expect(handlers.moves.length).toBe(0);
  });
});

describe("TimeGrid resize-drag", () => {
  it("fires onEventResize when the bottom edge is dragged down", async () => {
    const handlers = await renderGrid();
    const block = document.querySelector<HTMLButtonElement>('button[title="Biology lecture"]')!;
    const handles = Array.from(block.querySelectorAll<HTMLDivElement>("div")).filter((d) =>
      d.className.includes("cursor-ns-resize")
    );
    expect(handles.length).toBe(2);

    // Drag the bottom edge (second handle) down one hour.
    await act(async () => pointer("pointerdown", 100, handles[1]!));
    await windowPointer("pointermove", 100 + PX_PER_HOUR);
    await windowPointer("pointerup", 100 + PX_PER_HOUR);

    expect(handlers.moves.length).toBe(0); // the edge grab must not start a move
    expect(handlers.resizes.length).toBe(1);
    const { start, end } = handlers.resizes[0]!;
    // 09:00 start held, 10:00 end extended one hour to 11:00.
    expect(start.getHours()).toBe(9);
    expect(end.getHours()).toBe(11);
  });
});

describe("TimeGrid create-drag", () => {
  it("fires onSlotDragCreate for a drag across empty slots", async () => {
    const handlers = await renderGrid();
    const slots = document.querySelectorAll<HTMLDivElement>('div[role="button"]');
    expect(slots.length).toBe(24);

    // Anchor and live minutes derive from clientY, not from which slot is hit.
    // y=128 is 02:00, y=256 is 04:00.
    await act(async () => pointer("pointerdown", PX_PER_HOUR * 2, slots[2]!));
    await windowPointer("pointermove", PX_PER_HOUR * 4);
    await windowPointer("pointerup", PX_PER_HOUR * 4);

    expect(handlers.creates.length).toBe(1);
    const { start, end } = handlers.creates[0]!;
    expect(start.getHours()).toBe(2);
    expect(end.getHours()).toBe(4);
  });
});
