import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: DayGrid } = await import("../DayGrid");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

describe("DayGrid keyboard create", () => {
  it("opens the create path at the top of the chosen hour even when the viewed day carries a clock time", async () => {
    const created: Date[] = [];
    // The day view's date starts as "now", so it has minutes and seconds.
    const viewDate = new Date(2030, 8, 10, 4, 16, 33);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(() =>
      root?.render(
        createElement(DayGrid, {
          viewDate,
          selectedDate: viewDate,
          events: [],
          tasks: [],
          categories: [],
          spaceFocus: { selectedSpaceId: null },
          onDateSelect: () => {},
          onViewDateChange: () => {},
          onCreateEvent: (day: Date) => created.push(day),
          onEventClick: () => {},
          onTaskOpen: () => {},
          onTaskToggle: () => {},
          view: "day",
          onViewChange: () => {},
        })
      )
    );
    const slot = container.querySelector<HTMLElement>('[data-slot-day="0"][data-slot-hour="14"]')!;
    await act(() => {
      slot.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(created.length).toBe(1);
    expect(created[0]!.getHours()).toBe(14);
    expect(created[0]!.getMinutes()).toBe(0);
    expect(created[0]!.getSeconds()).toBe(0);
  });
});
