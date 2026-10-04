import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type {
  CalendarAlert,
  CalendarCategory,
  CalendarEvent,
  CalendarTask,
} from "@/lib/calendar-types";
import type { Branch } from "@/lib/branch-types";

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
    description: null,
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
    group_id: null,
    location: null,
    icon: null,
    ...overrides,
    description: null,
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
    group_id: null,
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
  /** Ids of the events and tasks that have an alert. */
  alertedIds?: string[];
  branches?: Branch[];
  activeBranchId?: string | null;
  date?: Date;
}

interface Interactions {
  eventClicks: string[];
  taskToggles: string[];
  taskOpens: string[];
  allTasksOpens: number;
}

async function renderColumn(options: RenderOptions = {}) {
  const interactions: Interactions = {
    eventClicks: [],
    taskToggles: [],
    taskOpens: [],
    allTasksOpens: 0,
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(AgendaColumn, {
        selectedDate: options.date ?? selectedDate,
        events: options.events ?? [],
        tasks: options.tasks ?? [],
        categories: options.categories ?? [],
        loading: options.loading ?? false,
        alertsByItem: new Map(
          (options.alertedIds ?? []).map((id) => [id, { id: `alert-${id}` } as CalendarAlert])
        ),
        onToggleTaskComplete: (task) =>
          interactions.taskToggles.push(task.id),
        onOpenTask: (task) => interactions.taskOpens.push(task.id),
        onEventClick: (event) => interactions.eventClicks.push(event.id),
        branches: options.branches ?? [],
        activeBranchId: options.activeBranchId ?? null,
        onOpenBranch: () => {},
        onOpenAllTasks: () => interactions.allTasksOpens++,
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
  it("renders the date as weekday, month and day", async () => {
    await renderColumn();

    const text = document.body.textContent ?? "";
    // September 17, 2030 is a Tuesday -> "Tuesday, Sep 17"
    expect(text).toContain("Tuesday");
    expect(text).toContain("Sep 17");
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
        makeTask({ id: "t4", title: "Overdue", due_at: new Date(2030, 8, 10).toISOString() }),
        makeTask({ id: "t5", title: "Undated", due_at: null }),
      ],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("2 events");
    expect(text).toContain("3 tasks due");
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

    // Color bar should carry the green swatch token class
    const bar = document.querySelector('[class*="evt-green-solid"]');
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

    const checkbox = byLabel("Mark Read chapter 5 as done");
    expect(checkbox).not.toBeNull();
  });

  it("lists only tasks due on the selected day", async () => {
    await renderColumn({
      tasks: [
        makeTask({ id: "due", title: "Due Tuesday" }),
        makeTask({ id: "late", title: "Overdue essay", due_at: new Date(2030, 8, 10).toISOString() }),
        makeTask({ id: "none", title: "Someday reading", due_at: null }),
        makeTask({ id: "next", title: "Due Wednesday", due_at: new Date(2030, 8, 18, 9).toISOString() }),
      ],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Due Tuesday");
    expect(text).not.toContain("Overdue essay");
    expect(text).not.toContain("Someday reading");
    expect(text).not.toContain("Due Wednesday");
  });

  it("switches its list when another day is selected", async () => {
    await renderColumn({
      date: new Date(2030, 8, 18, 12),
      tasks: [
        makeTask({ id: "due", title: "Due Tuesday" }),
        makeTask({ id: "next", title: "Due Wednesday", due_at: new Date(2030, 8, 18, 9).toISOString() }),
      ],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Due Wednesday");
    expect(text).not.toContain("Due Tuesday");
  });

  it('labels a non-today day "Due this day" and never "planned"', async () => {
    await renderColumn({ tasks: [makeTask()] });

    expect(byLabel("Due this day")).not.toBeNull();
    expect((document.body.textContent ?? "").toLowerCase()).not.toContain("planned");
  });

  it('labels today "Due today"', async () => {
    const now = new Date();
    await renderColumn({ date: now, tasks: [makeTask({ due_at: now.toISOString() })] });

    expect(byLabel("Due today")).not.toBeNull();
  });

  it("shows the empty state when only overdue or undated tasks exist", async () => {
    await renderColumn({
      tasks: [
        makeTask({ id: "late", due_at: new Date(2030, 8, 10).toISOString() }),
        makeTask({ id: "none", due_at: null }),
      ],
    });

    expect(document.body.textContent ?? "").toContain("Nothing scheduled");
  });

  it("opens All tasks from the header control", async () => {
    const interactions = await renderColumn();

    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "All tasks"
    );
    await act(() => button?.click());

    expect(interactions.allTasksOpens).toBe(1);
  });

  it("renders completed tasks with strikethrough and reduced opacity", async () => {
    await renderColumn({
      tasks: [makeTask({ title: "Done task", completed: true })],
    });

    const title = byLabel("Open task Done task");
    expect(title?.className).toContain("line-through");
    expect(title?.className).toContain("opacity-50");
  });

  it("calls onToggleTaskComplete when checkbox is clicked", async () => {
    const interactions = await renderColumn({
      tasks: [makeTask({ id: "task-toggle" })],
    });

    const checkbox = byLabel("Mark Finish lab report as done");
    expect(checkbox).not.toBeNull();
    await act(() => checkbox?.click());

    expect(interactions.taskToggles).toContain("task-toggle");
  });

  it("opens the task from its title without completing it", async () => {
    const interactions = await renderColumn({
      tasks: [makeTask({ id: "task-open" })],
    });

    await act(() => byLabel("Open task Finish lab report")?.click());

    expect(interactions.taskOpens).toEqual(["task-open"]);
    expect(interactions.taskToggles).toEqual([]);
  });

  it("shows a Space color dot driven by the task's category", async () => {
    const cat = makeCategory({ id: "cat-school", name: "CS 340", color: "green" });
    await renderColumn({
      tasks: [makeTask({ category_id: "cat-school", color_overridden: false })],
      categories: [cat],
    });

    const dot = document.querySelector('[class*="evt-green-solid"]');
    expect(dot).not.toBeNull();
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

describe("AgendaColumn alert bell", () => {
  const bells = () => document.querySelectorAll('[aria-label="Alert set"]');

  it("shows a bell named Alert set beside an event that has an alert", async () => {
    await renderColumn({
      events: [makeEvent({ id: "with", title: "Biology lecture" }), makeEvent({ id: "without", title: "Chem lab" })],
      alertedIds: ["with"],
    });
    expect(bells()).toHaveLength(1);
    const row = byLabel("Open event: Biology lecture")?.parentElement;
    expect(row?.querySelector('[aria-label="Alert set"]')).not.toBeNull();
    expect(byLabel("Open event: Chem lab")?.parentElement?.querySelector('[aria-label="Alert set"]')).toBeNull();
  });

  it("shows a bell beside a task that has an alert and nothing beside one without", async () => {
    await renderColumn({
      tasks: [makeTask({ id: "with", title: "Essay" }), makeTask({ id: "without", title: "Reading" })],
      alertedIds: ["with"],
    });
    expect(bells()).toHaveLength(1);
    const row = byLabel("Open task Essay")?.parentElement;
    expect(row?.querySelector('[aria-label="Alert set"]')).not.toBeNull();
  });

  it("shows no bell when nothing has an alert", async () => {
    await renderColumn({ events: [makeEvent()], tasks: [makeTask()] });
    expect(bells()).toHaveLength(0);
  });

  it("keeps the event row clickable with its name unchanged", async () => {
    const interactions = await renderColumn({ events: [makeEvent({ id: "e1" })], alertedIds: ["e1"] });
    await act(() => byLabel("Open event: Biology lecture")?.click());
    expect(interactions.eventClicks).toEqual(["e1"]);
  });
});
