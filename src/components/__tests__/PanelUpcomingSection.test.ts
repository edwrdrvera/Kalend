import "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarEvent } from "@/lib/calendar-types";
import type { UpcomingDay } from "@/lib/space-overview";

const { createRoot } = await import("react-dom/client");
const { default: PanelUpcomingSection } = await import("../PanelUpcomingSection");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function event(id: string, start: Date): CalendarEvent {
  return {
    id,
    title: `Shift ${id}`,
    start_at: start.toISOString(),
    end_at: new Date(start.getTime() + 3_600_000).toISOString(),
    color: null,
    color_overridden: false,
    category_id: "work",
    group_id: null,
    location: null,
    icon: null,
    description: null,
  };
}

function daysOf(count: number): UpcomingDay[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(2030, 0, 1 + i);
    return { day, events: [event(String(i), new Date(2030, 0, 1 + i, 9))] };
  });
}

async function render(days: UpcomingDay[]) {
  const opened: string[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(createElement(PanelUpcomingSection, { days, onOpenEvent: (e) => opened.push(e.id), onCreateEvent: () => {} }))
  );
  return opened;
}

const rows = () => container?.querySelectorAll('[aria-label^="Open event"]') ?? [];
const button = (text: string) =>
  [...(container?.querySelectorAll("button") ?? [])].find((b) => b.textContent === text);

describe("PanelUpcomingSection", () => {
  it("says nothing is scheduled when no events are coming up", async () => {
    await render([]);
    expect(container?.textContent).toContain("Nothing scheduled.");
  });

  it("labels each day and opens an event from its row", async () => {
    const opened = await render(daysOf(2));
    expect(container?.textContent).toContain("Tue, Jan 1");
    expect(container?.textContent).toContain("Wed, Jan 2");
    await act(() => (rows()[1] as HTMLButtonElement).click());
    expect(opened).toEqual(["1"]);
  });

  it("shows 5 rows until Show more reveals the rest, and Show less folds them back", async () => {
    await render(daysOf(8));
    expect(rows().length).toBe(5);
    await act(() => button("Show 3 more")?.click());
    expect(rows().length).toBe(8);
    await act(() => button("Show less")?.click());
    expect(rows().length).toBe(5);
  });

  it("has no Show more button when everything fits", async () => {
    await render(daysOf(5));
    expect(rows().length).toBe(5);
    expect(container?.textContent).not.toContain("Show");
  });
});
