import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: AgendaSummary, newTaskDraft } = await import("../AgendaSummary");

const categories: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green" },
];

const selectedDate = new Date(2030, 8, 9, 12);

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Biology lecture",
    start_at: new Date(2030, 8, 9, 9).toISOString(),
    end_at: new Date(2030, 8, 9, 10).toISOString(),
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
    due_at: new Date(2030, 8, 9, 23, 59).toISOString(),
    completed: false,
    color: "blue",
    color_overridden: true,
    category_id: null,
    ...overrides,
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
  localStorage.clear();
});

interface RenderOptions {
  events?: CalendarEvent[];
  tasks?: CalendarTask[];
  loading?: boolean;
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

interface Interactions {
  eventClicks: string[];
  taskToggles: string[];
  taskDeletes: string[];
}

async function renderSummary(options: RenderOptions = {}) {
  const interactions: Interactions = { eventClicks: [], taskToggles: [], taskDeletes: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(AgendaSummary, {
        events: options.events ?? [],
        tasks: options.tasks ?? [],
        selectedDate,
        loading: options.loading ?? false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleTaskComplete: (task) => interactions.taskToggles.push(task.id),
        onDeleteTask: (task) => interactions.taskDeletes.push(task.id),
        onEventClick: (event) => interactions.eventClicks.push(event.id),
      })
    )
  );
  return interactions;
}

describe("AgendaSummary display states", () => {
  it("shows event and task counts on a normal day", async () => {
    await renderSummary({
      events: [makeEvent(), makeEvent({ id: "event-2", title: "Chem lab" })],
      tasks: [makeTask()],
    });

    const text = container?.textContent ?? "";
    expect(text).toContain("2 events");
    expect(text).toContain("1 task due");
    expect(byLabel("Agenda summary")).not.toBeNull();
    // Has a chevron
    expect(container?.querySelector("svg.lucide-chevron-right")).not.toBeNull();
  });

  it("shows overdue state with warning icon", async () => {
    await renderSummary({
      events: [makeEvent()],
      tasks: [
        makeTask({
          id: "overdue-1",
          title: "Overdue task",
          due_at: new Date(2020, 0, 1).toISOString(),
          completed: false,
        }),
      ],
    });

    const text = container?.textContent ?? "";
    expect(text).toContain("1 overdue task");
    expect(byLabel("Agenda summary with overdue tasks")).not.toBeNull();
    // Warning icon present
    expect(container?.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
  });

  it("shows empty state with no chevron", async () => {
    await renderSummary({ events: [], tasks: [] });

    expect(container?.textContent).toContain("Nothing scheduled");
    expect(byLabel("Nothing scheduled")).not.toBeNull();
    // No chevron in empty state
    expect(container?.querySelector("svg.lucide-chevron-right")).toBeNull();
  });

  it("shows loading state", async () => {
    await renderSummary({ loading: true });

    expect(container?.textContent).toContain("Loading");
  });
});

describe("AgendaSummary interactions", () => {
  it("opens agenda detail popover when clicked in normal state", async () => {
    const interactions = await renderSummary({
      events: [makeEvent()],
      tasks: [makeTask()],
    });

    await act(() => byLabel("Agenda summary")?.click());
    // The popover should show the event and task details
    expect(byLabel("Edit event: Biology lecture")).not.toBeNull();
    expect(byLabel("Mark as done")).not.toBeNull();
    expect(byLabel("Delete task")).not.toBeNull();

    // Interactions work within the popover
    await act(() => byLabel("Mark as done")?.click());
    expect(interactions.taskToggles).toEqual(["task-1"]);

    await act(() => byLabel("Delete task")?.click());
    expect(interactions.taskDeletes).toEqual(["task-1"]);
  });

  it("does not open in empty state", async () => {
    await renderSummary();

    const button = byLabel("Nothing scheduled") as HTMLButtonElement | null;
    expect(button?.disabled).toBe(true);
  });

  it("opens the task creation popover from the + button", async () => {
    await renderSummary({ events: [makeEvent()] });

    expect(byLabel("New task title")).toBeNull();
    await act(() => byLabel("Create a task")?.click());
    expect(byLabel("New task title")).not.toBeNull();
  });

  it("preserves a nonempty draft on dismiss and restores it", async () => {
    await renderSummary({ events: [makeEvent()] });

    await act(() => byLabel("Create a task")?.click());
    const input = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!input) throw new Error("Task title input was not rendered");
    await act(() => typeInto(input, "Keep this"));

    // Close via the X toggle
    await act(() => byLabel("Close task composer")?.click());
    expect(byLabel("New task title")).toBeNull();
    expect(byLabel("Task draft saved")).not.toBeNull();

    // Reopen restores the draft
    await act(() => byLabel("Create a task")?.click());
    expect(document.querySelector<HTMLInputElement>('[aria-label="New task title"]')?.value)
      .toBe("Keep this");
  });
});

describe("newTaskDraft", () => {
  it("pre-fills and reveals the due date when one is given", () => {
    const draft = newTaskDraft("space-1", "2030-09-15");
    expect(draft).toEqual({
      title: "",
      showDueDate: true,
      dueDate: "2030-09-15",
      categoryId: "space-1",
      initialCategoryId: "space-1",
    });
  });

  it("keeps the due date hidden and empty without one (existing behavior)", () => {
    const draft = newTaskDraft("space-1");
    expect(draft).toEqual({
      title: "",
      showDueDate: false,
      dueDate: "",
      categoryId: "space-1",
      initialCategoryId: "space-1",
    });
  });
});
