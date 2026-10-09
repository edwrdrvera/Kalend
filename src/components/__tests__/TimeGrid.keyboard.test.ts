import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { initialSpaceFocus } from "@/lib/space-focus";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TimeGrid } = await import("../TimeGrid");

// Sunday 2030-09-08 through Saturday 2030-09-14.
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2030, 8, 8 + i));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

interface Calls {
  creates: Array<{ day: Date; hour: number }>;
  selects: Date[];
}

async function renderGrid(days: Date[] = WEEK): Promise<Calls> {
  const calls: Calls = { creates: [], selects: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(TimeGrid, {
        days,
        events: [],
        categories: [],
        spaceFocus: initialSpaceFocus,
        onSlotSelect: (day: Date) => calls.selects.push(day),
        onSlotCreate: (day: Date, hour: number) => calls.creates.push({ day, hour }),
      })
    )
  );
  return calls;
}

function slot(dayIndex: number, hour: number): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `[data-slot-day="${dayIndex}"][data-slot-hour="${hour}"]`
  );
  if (!el) throw new Error(`no slot ${dayIndex}/${hour}`);
  return el;
}

async function press(el: HTMLElement, key: string) {
  await act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

describe("TimeGrid keyboard", () => {
  it("puts exactly one of the 168 hour slots in the tab order, on 8 AM of the first day", async () => {
    await renderGrid();
    const stops = [...document.querySelectorAll<HTMLElement>("[data-slot-day]")].filter(
      (el) => el.tabIndex === 0
    );
    expect(document.querySelectorAll("[data-slot-day]").length).toBe(168);
    expect(stops.length).toBe(1);
    expect(stops[0]).toBe(slot(0, 8));
  });

  it("names each slot with its weekday, date, and hour", async () => {
    await renderGrid();
    expect(slot(2, 9).getAttribute("aria-label")).toBe("Tuesday September 10, 9 AM");
    expect(slot(4, 14).getAttribute("aria-label")).toBe("Thursday September 12, 2 PM");
    expect(slot(0, 0).getAttribute("aria-label")).toBe("Sunday September 8, 12 AM");
  });

  it("moves focus and the tab stop with the arrow keys", async () => {
    await renderGrid();
    await act(() => slot(0, 8).focus());
    await press(slot(0, 8), "ArrowRight");
    await press(slot(1, 8), "ArrowDown");
    expect(document.activeElement).toBe(slot(1, 9));
    expect(slot(1, 9).tabIndex).toBe(0);
    expect(slot(0, 8).tabIndex).toBe(-1);
  });

  it("stays on hour 23 when ArrowDown is pressed there", async () => {
    await renderGrid();
    await act(() => slot(0, 8).focus());
    await press(slot(0, 8), "End");
    expect(document.activeElement).toBe(slot(0, 23));
    await press(slot(0, 23), "ArrowDown");
    expect(document.activeElement).toBe(slot(0, 23));
  });

  it("opens the create path for the focused slot on Enter", async () => {
    const calls = await renderGrid();
    await act(() => slot(0, 8).focus());
    await press(slot(0, 8), "ArrowRight");
    await press(slot(1, 8), "ArrowRight");
    await press(slot(2, 8), "ArrowRight");
    for (let i = 0; i < 6; i++) await press(document.activeElement as HTMLElement, "ArrowDown");
    await press(document.activeElement as HTMLElement, "Enter");
    expect(calls.creates.length).toBe(1);
    expect(calls.creates[0]!.day.getDate()).toBe(11);
    expect(calls.creates[0]!.hour).toBe(14);
    expect(calls.selects.length).toBe(0);
  });

  it("selects the day on Space without creating", async () => {
    const calls = await renderGrid();
    await press(slot(0, 8), " ");
    expect(calls.creates.length).toBe(0);
    expect(calls.selects.length).toBe(1);
    expect(calls.selects[0]!.getDate()).toBe(8);
  });

  it("a click moves the tab stop to the clicked slot", async () => {
    await renderGrid();
    await act(() => slot(3, 5).focus());
    expect(slot(3, 5).tabIndex).toBe(0);
    expect(slot(0, 8).tabIndex).toBe(-1);
  });

  it("keeps a single column for the day view", async () => {
    await renderGrid([WEEK[1]!]);
    expect(document.querySelectorAll("[data-slot-day]").length).toBe(24);
    await act(() => slot(0, 8).focus());
    await press(slot(0, 8), "ArrowRight");
    expect(document.activeElement).toBe(slot(0, 8));
  });
});
