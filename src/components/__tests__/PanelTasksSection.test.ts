import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { addDays, format } from "date-fns";
import type { CalendarTask } from "@/lib/calendar-types";

await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: PanelTasksSection } = await import("../PanelTasksSection");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

function makeTask(overrides: Partial<CalendarTask> = {}): CalendarTask {
  return {
    id: "task-1",
    title: "Finish lab report",
    due_at: null,
    completed: false,
    color: "blue",
    color_overridden: false,
    category_id: null,
    group_id: null,
    ...overrides,
  };
}

interface Interactions {
  toggled: string[];
  opened: string[];
}

async function render(tasks: CalendarTask[]) {
  const interactions: Interactions = { toggled: [], opened: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(PanelTasksSection, {
        tasks,
        onToggleComplete: (task: CalendarTask) => interactions.toggled.push(task.id),
        onOpenTask: (task: CalendarTask) => interactions.opened.push(task.id),
        onChangeDue: () => {},
        onDelete: () => {},
        onAddTask: () => {},
      })
    )
  );
  return interactions;
}

describe("PanelTasksSection when empty", () => {
  it("says all caught up", async () => {
    await render([]);

    expect(container?.textContent).toContain("All caught up.");
  });
});

describe("PanelTasksSection heading", () => {
  it("counts the open tasks", async () => {
    await render([makeTask({ id: "a" }), makeTask({ id: "b" })]);
    expect(container?.querySelector("h3")?.textContent).toBe("Tasks · 2 open");
  });
});

describe("PanelTasksSection rows", () => {
  it("renders a row per task with its title", async () => {
    await render([makeTask({ id: "a", title: "Read chapter 4" })]);

    expect(container?.textContent).toContain("Read chapter 4");
  });

  it("toggles completion when the checkbox is clicked", async () => {
    const interactions = await render([makeTask({ id: "a" })]);

    document
      .querySelector('[aria-label="Mark Finish lab report as done"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(interactions.toggled).toEqual(["a"]);
  });

  it("opens the task from its expanded row without completing it", async () => {
    const interactions = await render([makeTask({ id: "a" })]);

    await act(() => {
      document
        .querySelector('[aria-label="Edit task Finish lab report"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    document
      .querySelector('[aria-label="Open task Finish lab report"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(interactions.opened).toEqual(["a"]);
    expect(interactions.toggled).toEqual([]);
  });

  it("exposes the checkbox as role=checkbox and reflects completion in aria-checked", async () => {
    await render([makeTask({ id: "a", completed: false })]);
    const open = document.querySelector('[aria-label="Mark Finish lab report as done"]');
    expect(open?.getAttribute("role")).toBe("checkbox");
    expect(open?.getAttribute("aria-checked")).toBe("false");

    await act(() => root?.unmount());
    container?.remove();
    await render([makeTask({ id: "a", completed: true })]);
    const done = document.querySelector('[aria-label="Mark Finish lab report as not done"]');
    expect(done?.getAttribute("role")).toBe("checkbox");
    expect(done?.getAttribute("aria-checked")).toBe("true");
  });
});

describe("PanelTasksSection due-state sub-lines", () => {
  it("shows 'No date' in muted (non-warning) styling when there is no due date", async () => {
    await render([makeTask({ id: "a", due_at: null })]);

    expect(container?.textContent).toContain("No date");
    const amber = container?.querySelector(".text-warning");
    expect(amber).toBeNull();
  });

  it("shows 'Overdue' with the warning color for a past-due task", async () => {
    const yesterday = addDays(new Date(), -1).toISOString();
    await render([makeTask({ id: "a", due_at: yesterday })]);

    expect(container?.textContent).toContain("Overdue");
    expect(container?.querySelector(".text-warning")?.textContent).toBe("Overdue");
  });

  it("shows 'Due today' with the warning color for a task due today", async () => {
    const today = new Date().toISOString();
    await render([makeTask({ id: "a", due_at: today })]);

    expect(container?.textContent).toContain("Due today");
    expect(container?.querySelector(".text-warning")?.textContent).toBe("Due today");
  });

  it("shows 'Due tomorrow' with the warning color for a task due tomorrow", async () => {
    const tomorrow = addDays(new Date(), 1).toISOString();
    await render([makeTask({ id: "a", due_at: tomorrow })]);

    expect(container?.textContent).toContain("Due tomorrow");
    expect(container?.querySelector(".text-warning")?.textContent).toBe("Due tomorrow");
  });

  it("shows a formatted date in muted (non-warning) styling for a far-future task", async () => {
    const future = addDays(new Date(), 10);
    await render([makeTask({ id: "a", due_at: future.toISOString() })]);

    const expected = format(future, "MMM d");
    expect(container?.textContent).toContain(expected);
    expect(container?.querySelector(".text-warning")).toBeNull();
  });

  it("never applies the warning color to a completed, overdue task", async () => {
    const yesterday = addDays(new Date(), -1).toISOString();
    await render([makeTask({ id: "a", due_at: yesterday, completed: true })]);

    expect(container?.querySelector(".text-warning")).toBeNull();
  });
});
