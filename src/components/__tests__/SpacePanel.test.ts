import "./test-dom";
import { typeInto } from "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import { FIXTURE_BRANCH_FULL } from "@/lib/branch-fixtures";
import type { Branch } from "@/lib/branch-types";
import type { UpcomingDay } from "@/lib/space-overview";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: SpacePanel } = await import("../SpacePanel");

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
  closes: number;
  created: string[];
  eventCreates: number;
}

async function render(branch: Branch, tasks: CalendarTask[] = [], upcoming: UpcomingDay[] = []) {
  const handlers: Handlers = { closes: 0, created: [], eventCreates: 0 };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(SpacePanel, {
        branch,
        tasks,
        upcoming,
        modal: false,
        onClose: () => {
          handlers.closes++;
        },
        onToggleComplete: () => {},
        onOpenTask: () => {},
        onOpenEvent: () => {},
        onCreateEvent: () => {
          handlers.eventCreates++;
        },
        onCreateTask: async (title: string) => {
          handlers.created.push(title);
        },
        onOpenSettings: () => {},
      })
    )
  );
  return handlers;
}

const buttonWithText = (text: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === text);

const TASK: CalendarTask = {
  id: "t1",
  title: "Submit timesheet",
  due_at: null,
  completed: false,
  color: null,
  color_overridden: false,
  category_id: "fixture-school",
};

const SHIFT_DAY: UpcomingDay = {
  day: new Date(2030, 0, 1),
  events: [
    {
      id: "e1",
      title: "Morning shift",
      start_at: new Date(2030, 0, 1, 9).toISOString(),
      end_at: new Date(2030, 0, 1, 13).toISOString(),
      color: null,
      color_overridden: false,
      category_id: "fixture-school",
      location: null,
      icon: null,
    },
  ],
};

describe("SpacePanel", () => {
  it("shows the Space label and branch heading, with no placeholder sections", async () => {
    await render(FIXTURE_BRANCH_FULL);
    const text = container?.textContent ?? "";
    expect(text).toContain("School");
    expect(text).toContain("CS 340");
    expect(text).not.toContain("Meets");
    expect(text).not.toContain("People");
    expect(text).not.toContain("Links");
  });

  it("shows an empty state with both add actions when the Space has nothing", async () => {
    const handlers = await render(FIXTURE_BRANCH_FULL);
    expect(container?.textContent).toContain("Nothing coming up in CS 340");
    expect(container?.textContent).not.toContain("Open tasks");
    await act(() => buttonWithText("Add event")?.click());
    expect(handlers.eventCreates).toBe(1);
  });

  it("hides the empty state while the task composer is open", async () => {
    await render(FIXTURE_BRANCH_FULL);
    await act(() => buttonWithText("Add task")?.click());
    expect(document.querySelector('[aria-label="New task title"]')).not.toBeNull();
    expect(container?.textContent).not.toContain("Nothing coming up");
  });

  it("shows only upcoming events for a Space with events and no tasks", async () => {
    await render(FIXTURE_BRANCH_FULL, [], [SHIFT_DAY]);
    const text = container?.textContent ?? "";
    expect(text).toContain("Morning shift");
    expect(text).not.toContain("Open tasks");
    expect(text).not.toContain("Nothing coming up");
  });

  it("drops the empty state once the Space has a task", async () => {
    await render(FIXTURE_BRANCH_FULL, [TASK]);
    const text = container?.textContent ?? "";
    expect(text).toContain("Submit timesheet");
    expect(text).not.toContain("Nothing coming up");
    expect(text).not.toContain("Upcoming");
  });

  it("closes on Escape when focus is inside the panel", async () => {
    const handlers = await render(FIXTURE_BRANCH_FULL);
    const panel = container?.querySelector<HTMLElement>('[role="complementary"]');
    await act(() => {
      panel?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(handlers.closes).toBe(1);
  });

  it("reveals a composer from + Add and creates a task in the branch", async () => {
    const handlers = await render(FIXTURE_BRANCH_FULL);
    const add = buttonWithText("Add task");
    await act(() => add?.click());

    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="New task title"]'
    );
    expect(input).not.toBeNull();
    if (input) await act(() => typeInto(input, "Read chapter 4"));
    const form = document.querySelector<HTMLFormElement>("form");
    await act(() => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(handlers.created).toEqual(["Read chapter 4"]);
  });
});
