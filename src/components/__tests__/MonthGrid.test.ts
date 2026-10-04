import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarEvent } from "@/lib/calendar-types";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: MonthGrid } = await import("../MonthGrid");

const DAY = new Date(2030, 8, 9);

function makeEvent(id: string, categoryId: string): CalendarEvent {
  return {
    id,
    title: id,
    start_at: new Date(2030, 8, 9, 9).toISOString(),
    end_at: new Date(2030, 8, 9, 10).toISOString(),
    color: "blue",
    color_overridden: true,
    category_id: categoryId,
    location: null,
    icon: null,
    description: null,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderMonth(events: CalendarEvent[], selectedSpaceId: string | null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(MonthGrid, {
        viewDate: DAY,
        selectedDate: DAY,
        events,
        tasks: [],
        categories: [],
        spaceFocus: { selectedSpaceId },
        onDateSelect: () => {},
        onViewDateChange: () => {},
        onCreateEvent: () => {},
        onEventClick: () => {},
        view: "month",
        onViewChange: () => {},
      })
    )
  );
  return container;
}

function chipTitles(el: HTMLElement) {
  return [...el.querySelectorAll<HTMLButtonElement>("button[title]")].map((b) => b.title);
}

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

describe("MonthGrid Space emphasis", () => {
  it("shows the selected Space's event ahead of other Spaces' events when the day overflows", async () => {
    const events = [
      makeEvent("other-1", "other"),
      makeEvent("other-2", "other"),
      makeEvent("other-3", "other"),
      makeEvent("mine", "work"),
    ];
    const el = await renderMonth(events, "work");
    const chip = el.querySelector<HTMLButtonElement>('button[title="mine"]');
    expect(chip).not.toBeNull();
    expect(chip?.className).not.toContain("opacity-50");
    expect(el.textContent).toContain("+1 more");
  });

  it("keeps the original order within each group", async () => {
    const events = [
      makeEvent("other-1", "other"),
      makeEvent("mine-1", "work"),
      makeEvent("other-2", "other"),
      makeEvent("mine-2", "work"),
    ];
    const el = await renderMonth(events, "work");
    expect(chipTitles(el)).toEqual(["mine-1", "mine-2", "other-1"]);
  });

  it("keeps the original order when no Space is selected", async () => {
    const events = [makeEvent("a", "x"), makeEvent("b", "y"), makeEvent("c", "x"), makeEvent("d", "y")];
    const el = await renderMonth(events, null);
    expect(chipTitles(el)).toEqual(["a", "b", "c"]);
  });
});
