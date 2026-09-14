import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarTask,
} from "@/lib/calendar-types";

// Install DOM globals before importing React DOM (see test-dom.ts).
await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: AgendaColumn } = await import("../AgendaColumn");

// ── Fixtures ──────────────────────────────────────────────────────────────

// Thursday, September 17 2030
const selectedDate = new Date(2030, 8, 17, 12);

function makeCategory(
  overrides: Partial<CalendarCategory> = {}
): CalendarCategory {
  return {
    id: "cat-1",
    name: "School",
    color: "blue",
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent {
  return {
    id: "event-1",
    title: "Biology lecture",
    start_at: new Date(2030, 8, 17, 9, 0).toISOString(),
    end_at: new Date(2030, 8, 17, 10, 0).toISOString(),
    color: "blue",
    color_overridden: true,
    category_id: null,
    location: null,
    icon: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<CalendarTask> = {}): CalendarTask {
  return {
    id: "task-1",
    title: "Finish lab report",
    due_at: new Date(2030, 8, 17, 23, 59).toISOString(),
    completed: false,
    color: "blue",
    color_overridden: true,
    category_id: null,
    ...overrides,
  };
}

// ── Render harness ────────────────────────────────────────────────────────

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

interface RenderOptions {
  events?: CalendarEvent[];
  tasks?: CalendarTask[];
  categories?: CalendarCategory[];
  loading?: boolean;
  selectedSpaceId?: string | null;
}

interface Interactions {
  eventClicks: string[];
  taskToggles: string[];
  taskDeletes: string[];
  createdTasks: Array<{
    title: string;
    dueAt?: string;
    categoryId?: string | null;
  }>;
}

async function renderColumn(options: RenderOptions = {}) {
  const interactions: Interactions = {
    eventClicks: [],
    taskToggles: [],
    taskDeletes: [],
    createdTasks: [],
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(AgendaColumn, {
        selectedDate,
        events: options.events ?? [],
        tasks: options.tasks ?? [],
        categories: options.categories ?? [],
        loading: options.loading ?? false,
        selectedSpaceId: options.selectedSpaceId ?? null,
        onCreateTask: async (title, dueAt, categoryId) => {
          interactions.createdTasks.push({ title, dueAt, categoryId });
        },
        onToggleTaskComplete: (task) =>
          interactions.taskToggles.push(task.id),
        onDeleteTask: (task) => interactions.taskDeletes.push(task.id),
        onEventClick: (event) => interactions.eventClicks.push(event.id),
      })
    )
  );
  return interactions;
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

function byTestId(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("AgendaColumn date header", () => {
  it("renders the date in day-of-week + date number format", async () => {
    await renderColumn();

    const text = document.body.textContent ?? "";
    // September 17, 2030 is a Tuesday
    expect(text).toContain("Tuesday");
    expect(text).toContain("17");
    // Should not include a comma between them (spec says no comma)
    expect(text).not.toContain("Tuesday,");
  });

  it("shows event and task counts in the sub-line", async () => {
    await renderColumn({
      events: [
        makeEvent({ id: "e1", title: "Event A" }),
        makeEvent({
          id: "e2",
          title: "Event B",
          start_at: new Date(2030, 8, 17, 14).toISOString(),
          end_at: new Date(2030, 8, 17, 15).toISOString(),
        }),
      ],
      tasks: [
        makeTask({ id: "t1", title: "Task A" }),
        makeTask({ id: "t2", title: "Task B" }),
        makeTask({ id: "t3", title: "Task C" }),
      ],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("2 events");
    expect(text).toContain("3 tasks");
  });
});

describe("AgendaColumn schedule section", () => {
  it("renders events sorted by start time", async () => {
    await renderColumn({
      events: [
        makeEvent({
          id: "e-late",
          title: "Afternoon meeting",
          start_at: new Date(2030, 8, 17, 14, 30).toISOString(),
          end_at: new Date(2030, 8, 17, 15, 30).toISOString(),
        }),
        makeEvent({
          id: "e-early",
          title: "Morning standup",
          start_at: new Date(2030, 8, 17, 9, 0).toISOString(),
          end_at: new Date(2030, 8, 17, 9, 30).toISOString(),
        }),
      ],
    });

    const text = document.body.textContent ?? "";
    const morningIdx = text.indexOf("Morning standup");
    const afternoonIdx = text.indexOf("Afternoon meeting");
    expect(morningIdx).toBeGreaterThan(-1);
    expect(afternoonIdx).toBeGreaterThan(-1);
    expect(morningIdx).toBeLessThan(afternoonIdx);
  });

  it("shows time, color bar, and title for each event row", async () => {
    await renderColumn({
      events: [makeEvent({ title: "Calculus", color: "green" })],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("9:00 AM");
    expect(text).toContain("Calculus");

    // Color bar should have the green swatch class
    const bar = document.querySelector(".bg-green-500");
    expect(bar).not.toBeNull();
  });
});

describe("AgendaColumn tasks section", () => {
  it("renders tasks with checkbox and title", async () => {
    await renderColumn({
      tasks: [makeTask({ title: "Read chapter 5" })],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Read chapter 5");

    const checkbox = byLabel("Mark as done");
    expect(checkbox).not.toBeNull();
  });

  it("renders completed tasks with strikethrough and reduced opacity", async () => {
    await renderColumn({
      tasks: [makeTask({ title: "Done task", completed: true })],
    });

    // Find the title span with line-through
    const spans = document.querySelectorAll("span");
    let found = false;
    for (const span of spans) {
      if ((span.textContent ?? "").trim() === "Done task") {
        expect(span.className).toContain("line-through");
        expect(span.className).toContain("opacity-50");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("calls onToggleTaskComplete when checkbox is clicked", async () => {
    const interactions = await renderColumn({
      tasks: [makeTask({ id: "task-toggle" })],
    });

    const checkbox = byLabel("Mark as done");
    expect(checkbox).not.toBeNull();
    await act(() => checkbox?.click());

    expect(interactions.taskToggles).toContain("task-toggle");
  });

  it("shows breadcrumb sub-line with category name", async () => {
    const cat = makeCategory({ id: "cat-school", name: "CS 340" });
    await renderColumn({
      tasks: [makeTask({ category_id: "cat-school" })],
      categories: [cat],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("CS 340");
  });
});

describe("AgendaColumn empty state", () => {
  it("shows empty state when no events or tasks", async () => {
    await renderColumn({ events: [], tasks: [] });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Nothing scheduled");
    expect(text).toContain("September 17");
  });
});

describe("AgendaColumn loading state", () => {
  it("shows spinner when loading", async () => {
    await renderColumn({ loading: true });

    const spinner = byLabel("Loading agenda");
    expect(spinner).not.toBeNull();

    // Should not show any schedule or task sections while loading
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("Schedule");
    expect(text).not.toContain("Tasks");
  });
});
