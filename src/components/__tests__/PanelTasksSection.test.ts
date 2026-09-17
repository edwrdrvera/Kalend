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
    ...overrides,
  };
}

interface Interactions {
  toggled: string[];
  added: boolean;
}

async function render(tasks: CalendarTask[]) {
  const interactions: Interactions = { toggled: [], added: false };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(PanelTasksSection, {
        tasks,
        onToggleComplete: (task: CalendarTask) => interactions.toggled.push(task.id),
        onAdd: () => {
          interactions.added = true;
        },
      })
    )
  );
  return interactions;
}

describe("PanelTasksSection label row", () => {
  it("always renders the label and Add affordance, even with no tasks", async () => {
    await render([]);

    expect(document.querySelector("h3")?.textContent).toBe("Open tasks");
    expect(document.querySelector('[aria-label="Add task"]')).not.toBeNull();
  });

  it("calls onAdd when + Add is clicked", async () => {
    const interactions = await render([]);

    document
      .querySelector('[aria-label="Add task"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(interactions.added).toBe(true);
  });

  it("renders no rows when there are no tasks", async () => {
    await render([]);

    expect(document.querySelectorAll('[aria-pressed]')).toHaveLength(0);
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
      .querySelector('[aria-label="Mark as done"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(interactions.toggled).toEqual(["a"]);
  });

  it("shows a checked, aria-pressed checkbox for a completed task", async () => {
    await render([makeTask({ id: "a", completed: true })]);

    const checkbox = document.querySelector('[aria-label="Mark as not done"]');
    expect(checkbox?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("PanelTasksSection due-state sub-lines", () => {
  it("shows 'No date' in muted (non-warning) styling when there is no due date", async () => {
    await render([makeTask({ id: "a", due_at: null })]);

    expect(container?.textContent).toContain("No date");
    const amber = container?.querySelector(".text-amber-600");
    expect(amber).toBeNull();
  });

  it("shows 'Overdue' with the warning color for a past-due task", async () => {
    const yesterday = addDays(new Date(), -1).toISOString();
    await render([makeTask({ id: "a", due_at: yesterday })]);

    expect(container?.textContent).toContain("Overdue");
    expect(container?.querySelector(".text-amber-600")?.textContent).toBe("Overdue");
  });

  it("shows 'Due today' with the warning color for a task due today", async () => {
    const today = new Date().toISOString();
    await render([makeTask({ id: "a", due_at: today })]);

    expect(container?.textContent).toContain("Due today");
    expect(container?.querySelector(".text-amber-600")?.textContent).toBe("Due today");
  });

  it("shows 'Due tomorrow' with the warning color for a task due tomorrow", async () => {
    const tomorrow = addDays(new Date(), 1).toISOString();
    await render([makeTask({ id: "a", due_at: tomorrow })]);

    expect(container?.textContent).toContain("Due tomorrow");
    expect(container?.querySelector(".text-amber-600")?.textContent).toBe("Due tomorrow");
  });

  it("shows a formatted date in muted (non-warning) styling for a far-future task", async () => {
    const future = addDays(new Date(), 10);
    await render([makeTask({ id: "a", due_at: future.toISOString() })]);

    const expected = format(future, "MMM d");
    expect(container?.textContent).toContain(expected);
    expect(container?.querySelector(".text-amber-600")).toBeNull();
  });

  it("never applies the warning color to a completed, overdue task", async () => {
    const yesterday = addDays(new Date(), -1).toISOString();
    await render([makeTask({ id: "a", due_at: yesterday, completed: true })]);

    expect(container?.querySelector(".text-amber-600")).toBeNull();
  });
});
