import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TaskChip } = await import("../TaskChip");

const categories = [{ id: "space-1", name: "Work", color: "green", description: null }];

const defaultTask: CalendarTask = {
  id: "task-1",
  title: "Finish lab report",
  due_at: "2999-09-10T23:59:59.000Z",
  completed: false,
  color: "blue",
  color_overridden: false,
  category_id: "space-1",
  group_id: null,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderTask(task: CalendarTask, dimmed = false) {
  const calls = { opened: [] as string[], toggled: [] as string[] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(TaskChip, {
        task,
        categories,
        dimmed,
        onOpen: (t) => calls.opened.push(t.id),
        onToggleComplete: (t) => calls.toggled.push(t.id),
      })
    )
  );
  const checkbox = container.querySelector<HTMLElement>('[role="checkbox"]');
  const title = container.querySelector<HTMLButtonElement>(`button[aria-label="Open task ${task.title}"]`);
  if (!checkbox || !title) throw new Error("Task chip was not rendered");
  return { calls, checkbox, title, chip: container.firstElementChild as HTMLElement };
}

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("TaskChip", () => {
  it("renders an accessible checkbox and a named title button", async () => {
    const { checkbox, title, chip } = await renderTask(defaultTask);

    expect(checkbox.getAttribute("aria-label")).toBe("Mark as done: Finish lab report");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(title.textContent).toBe("Finish lab report");
    expect(chip.className).toContain("min-h-7");
    expect(container?.querySelector('[class*="evt-green-solid"]')).not.toBeNull();
  });

  it("uses clear completed and overdue states", async () => {
    let rendered = await renderTask({ ...defaultTask, completed: true });
    expect(rendered.checkbox.getAttribute("aria-label")).toBe("Mark as not done: Finish lab report");
    expect(rendered.checkbox.getAttribute("aria-checked")).toBe("true");
    expect(rendered.title.className).toContain("line-through");

    await act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;

    rendered = await renderTask({ ...defaultTask, due_at: "2000-01-01T00:00:00.000Z" });
    expect(rendered.chip.className).toContain("text-destructive");
    expect(rendered.title.className).not.toContain("line-through");
  });

  it("opens the task from its title without completing it", async () => {
    const { calls, title } = await renderTask(defaultTask);
    await act(() => title.click());
    expect(calls.opened).toEqual([defaultTask.id]);
    expect(calls.toggled).toEqual([]);
  });

  it("completes the task only from its checkbox", async () => {
    const { calls, checkbox } = await renderTask(defaultTask);
    await act(() => checkbox.click());
    expect(calls.toggled).toEqual([defaultTask.id]);
    expect(calls.opened).toEqual([]);
  });

  it("keeps its clicks from reaching the day cell underneath", async () => {
    const { checkbox, title } = await renderTask(defaultTask);
    let parentClicks = 0;
    document.body.addEventListener("click", () => {
      parentClicks += 1;
    });

    await act(() => title.click());
    await act(() => checkbox.click());

    expect(parentClicks).toBe(0);
  });

  it("dims a task outside the selected Space but keeps it clickable", async () => {
    const full = await renderTask(defaultTask);
    expect(full.chip.className).not.toContain("opacity-50");

    await act(() => root?.unmount());
    container?.remove();

    const dimmed = await renderTask(defaultTask, true);
    expect(dimmed.chip.className).toContain("opacity-50");
    await act(() => dimmed.title.click());
    await act(() => dimmed.checkbox.click());
    expect(dimmed.calls.opened).toEqual([defaultTask.id]);
    expect(dimmed.calls.toggled).toEqual([defaultTask.id]);
  });
});
