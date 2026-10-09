import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarEvent } from "@/lib/calendar-types";
import { initialSpaceFocus, type SpaceFocus } from "@/lib/space-focus";
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
    group_id: null,
    location: null,
    icon: null,
    description: null,
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
  creates: Array<{ start: Date; end: Date; rect: DOMRect }>;
}

async function renderGrid(spaceFocus: SpaceFocus = initialSpaceFocus): Promise<Handlers> {
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
        spaceFocus,
        onEventMove: (event, start, end) => handlers.moves.push({ event, start, end }),
        onEventResize: (event, start, end) => handlers.resizes.push({ event, start, end }),
        onSlotDragCreate: (start, end, rect) => handlers.creates.push({ start, end, rect }),
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

  it("anchors the creator on the sketched box, not the whole day column", async () => {
    const handlers = await renderGrid();
    const slots = document.querySelectorAll<HTMLDivElement>('div[role="button"]');

    await act(async () => pointer("pointerdown", PX_PER_HOUR * 2, slots[2]!));
    await windowPointer("pointermove", PX_PER_HOUR * 4);
    await windowPointer("pointerup", PX_PER_HOUR * 4);

    const { rect } = handlers.creates[0]!;
    expect(rect.top).toBe(PX_PER_HOUR * 2);
    expect(rect.height).toBe(PX_PER_HOUR * 2);
  });
});

describe("TimeGrid create anchor with the week-wide now line", () => {
  it("anchors on the dragged column even though the now line is a grid sibling", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const today = new Date();
    const days = [today, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)];
    const creates: DOMRect[] = [];

    await act(() =>
      root?.render(
        createElement(TimeGrid, {
          days,
          events: [],
          categories: [],
          spaceFocus: initialSpaceFocus,
          onSlotDragCreate: (_s, _e, rect) => creates.push(rect),
        })
      )
    );

    const columns = document.querySelectorAll<HTMLElement>("[data-day-index]");
    expect(columns.length).toBe(2);
    columns.forEach((col, i) => {
      col.getBoundingClientRect = () => new DOMRect(i * 500, 0, 400, 100);
    });

    const slot = columns[1]!.querySelector<HTMLDivElement>('div[role="button"]')!;
    await act(async () => pointer("pointerdown", PX_PER_HOUR * 2, slot));
    await windowPointer("pointermove", PX_PER_HOUR * 4);
    await windowPointer("pointerup", PX_PER_HOUR * 4);

    expect(creates.length).toBe(1);
    expect(creates[0]!.left).toBe(500);
  });
});

describe("TimeGrid Space emphasis", () => {
  it("dims an event outside the selected Space and still lets it be dragged", async () => {
    const handlers = await renderGrid({ selectedSpaceId: "other" });
    const block = document.querySelector<HTMLButtonElement>('button[title="Biology lecture"]');
    expect(block?.className).toContain("opacity-50");

    await act(async () => pointer("pointerdown", 100, block!));
    await windowPointer("pointermove", 100 + PX_PER_HOUR);
    await windowPointer("pointerup", 100 + PX_PER_HOUR);
    expect(handlers.moves.length).toBe(1);
  });

  it("keeps full strength when no Space is selected", async () => {
    await renderGrid();
    const block = document.querySelector<HTMLButtonElement>('button[title="Biology lecture"]');
    expect(block?.className).not.toContain("opacity-50");
  });
});
