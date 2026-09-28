import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: AllTasksPanel } = await import("../AllTasksPanel");

function makeTask(overrides: Partial<CalendarTask> = {}): CalendarTask {
  return {
    id: "task-1",
    title: "Finish lab report",
    due_at: null,
    completed: false,
    color: "blue",
    color_overridden: true,
    category_id: null,
    ...overrides,
  };
}

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

let root: Root | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
  localStorage.clear();
});

async function renderPanel(tasks: CalendarTask[]) {
  const calls = {
    toggled: [] as string[],
    created: [] as Array<{ title: string; categoryId?: string | null }>,
    closes: 0,
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(AllTasksPanel, {
        tasks,
        categories: [],
        selectedSpaceId: "cat-1",
        modal: false,
        onClose: () => calls.closes++,
        onCreateTask: async (title, _dueAt, categoryId) => {
          calls.created.push({ title, categoryId });
        },
        onToggleTaskComplete: (task) => calls.toggled.push(task.id),
      })
    )
  );
  return calls;
}

const text = () => document.body.textContent ?? "";
const byLabel = (label: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const buttonWithText = (label: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(label));

describe("AllTasksPanel", () => {
  it("lists overdue and undated open tasks", async () => {
    await renderPanel([
      makeTask({ id: "late", title: "Overdue essay", due_at: daysFromNow(-3) }),
      makeTask({ id: "none", title: "Someday reading" }),
    ]);

    expect(text()).toContain("Overdue");
    expect(text()).toContain("Overdue essay");
    expect(text()).toContain("Unscheduled");
    expect(text()).toContain("Someday reading");
  });

  it("keeps completed tasks behind a Completed toggle and reopens them", async () => {
    const calls = await renderPanel([
      makeTask({ id: "done", title: "Old quiz", completed: true, due_at: daysFromNow(-5) }),
    ]);

    expect(text()).not.toContain("Old quiz");
    const toggle = buttonWithText("Completed");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    await act(() => toggle?.click());
    expect(text()).toContain("Old quiz");

    await act(() => byLabel("Mark Old quiz as not done")?.click());
    expect(calls.toggled).toEqual(["done"]);
  });

  it("adds a task from the composer, seeded with the selected Space", async () => {
    const calls = await renderPanel([]);

    await act(() => byLabel("Add a task")?.click());
    const input = byLabel("New task title") as HTMLInputElement;
    await act(() => typeInto(input, "Study for midterm"));
    await act(async () => byLabel("Add task")?.click());

    expect(calls.created).toEqual([{ title: "Study for midterm", categoryId: "cat-1" }]);
  });

  it("closes on Escape", async () => {
    const calls = await renderPanel([]);
    const panel = byLabel("All tasks");
    await act(() =>
      panel?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    );
    expect(calls.closes).toBe(1);
  });
});
