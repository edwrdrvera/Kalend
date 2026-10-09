import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar-types";
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
    group_id: null,
    location: null,
    icon: null,
    description: null,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderMonth(events: CalendarEvent[], selectedSpaceId: string | null, tasks: CalendarTask[] = []) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(MonthGrid, {
        viewDate: DAY,
        selectedDate: DAY,
        events,
        tasks,
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
  // The header's Previous and Next buttons also carry a title, so skip them.
  return [...el.querySelectorAll<HTMLButtonElement>("button[title]")]
    .filter((b) => !/^(Previous|Next) /.test(b.getAttribute("aria-label") ?? ""))
    .map((b) => b.title);
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
    expect(chip?.className).not.toContain("opacity-80");
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

function makeTask(id: string): CalendarTask {
  return {
    id,
    title: id,
    due_at: new Date(2030, 8, 9, 17).toISOString(),
    completed: false,
    color: null,
    color_overridden: false,
    category_id: null,
    group_id: null,
  };
}

describe("MonthGrid overflow row", () => {
  const four = [makeEvent("a", "x"), makeEvent("b", "x"), makeEvent("c", "x"), makeEvent("d", "x")];
  const footer = (el: HTMLElement) =>
    [...el.querySelectorAll("span")].map((s) => s.textContent).filter((t) => /more|task/.test(t ?? ""));

  it("puts hidden events and the day's tasks on one row", async () => {
    const el = await renderMonth(four, null, [makeTask("t1"), makeTask("t2")]);
    expect(footer(el)).toEqual(["+1 more · 2 tasks"]);
  });

  it("shows only the hidden events when the day has no tasks", async () => {
    const el = await renderMonth(four, null);
    expect(footer(el)).toEqual(["+1 more"]);
  });

  it("shows only the task count when every event fits", async () => {
    const el = await renderMonth([makeEvent("a", "x")], null, [makeTask("t1")]);
    expect(footer(el)).toEqual(["1 task"]);
  });
});
