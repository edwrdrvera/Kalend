import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: AllSpacesPanel } = await import("../AllSpacesPanel");

function makeTask(overrides: Partial<CalendarTask> = {}): CalendarTask {
  return {
    id: "task-1",
    title: "Finish lab report",
    due_at: null,
    completed: false,
    color: "blue",
    color_overridden: true,
    category_id: null,
    group_id: null,
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
    opened: [] as string[],
    created: [] as Array<{ title: string; categoryId?: string | null }>,
    closes: 0,
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(AllSpacesPanel, {
        tasks,
        categories: [],
        groups: [],
        weekLoad: [],
        selectedSpaceId: "cat-1",
        modal: false,
        onClose: () => calls.closes++,
        onCreateTask: async (title: string, _dueAt?: string, categoryId?: { category_id: string | null }) => {
          calls.created.push({ title, categoryId: categoryId?.category_id });
        },
        onToggleTaskComplete: (task: CalendarTask) => calls.toggled.push(task.id),
        onOpenTask: (task: CalendarTask) => calls.opened.push(task.id),
        onChangeTaskDue: () => {},
        onDeleteTask: () => {},
        onSelectDay: () => {},
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

describe("AllSpacesPanel", () => {
  it("lists overdue and undated open tasks", async () => {
    await renderPanel([
      makeTask({ id: "late", title: "Overdue essay", due_at: daysFromNow(-3) }),
      makeTask({ id: "none", title: "Someday reading" }),
    ]);

    expect(text()).toContain("Overdue");
    expect(text()).toContain("Overdue essay");
    expect(text()).toContain("No date");
    expect(text()).toContain("Someday reading");
  });

  it("keeps completed tasks behind a Completed toggle and reopens them", async () => {
    const calls = await renderPanel([
      makeTask({ id: "done", title: "Old quiz", completed: true, due_at: daysFromNow(-5) }),
    ]);

    expect(text()).not.toContain("Old quiz");
    const toggle = buttonWithText("Show completed");
    await act(() => toggle?.click());
    expect(text()).toContain("Old quiz");

    await act(() => byLabel("Mark Old quiz as not done")?.click());
    expect(calls.toggled).toEqual(["done"]);
  });

  it("adds a task from the composer, seeded with the selected Space", async () => {
    const calls = await renderPanel([]);

    await act(() => byLabel("Add task")?.click());
    const input = byLabel("New task title") as HTMLInputElement;
    await act(() => typeInto(input, "Study for midterm"));
    await act(async () => [...document.querySelectorAll<HTMLElement>('[aria-label="Add task"]')].at(-1)?.click());

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

  it("switches between the Tasks and Alerts tabs", async () => {
    await renderPanel([makeTask({ title: "Read ch 4" })]);
    const tab = (name: string) =>
      [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent === name);
    expect(tab("Resources")).toBeUndefined();
    await act(() => tab("Alerts")?.click());
    expect(text()).toContain("Notify me about all spaces");
    expect(text()).not.toContain("Read ch 4");
  });
});
