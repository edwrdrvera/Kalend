import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TaskChip } = await import("../TaskChip");

const categories = [{ id: "space-1", name: "Work", color: "green" }];

const defaultTask: CalendarTask = {
  id: "task-1",
  title: "Finish lab report",
  due_at: "2999-09-10T23:59:59.000Z",
  completed: false,
  color: "blue",
  color_overridden: false,
  category_id: "space-1",
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderTask(task: CalendarTask, onClick?: (task: CalendarTask) => void) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(TaskChip, { task, categories, onClick })));
  const button = container.querySelector("button");
  if (!button) throw new Error("Task chip was not rendered");
  return button;
}

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("TaskChip", () => {
  it("renders an accessible, compact checkbox-led task marker", async () => {
    const button = await renderTask(defaultTask);

    expect(button.getAttribute("aria-label")).toBe("Mark as done: Finish lab report");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.className).toContain("min-h-7");
    expect(button.className).toContain("focus-visible:ring-2");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(container?.querySelector(".bg-green-500")).not.toBeNull();
  });

  it("uses clear completed and overdue states", async () => {
    let button = await renderTask({ ...defaultTask, completed: true });
    expect(button.getAttribute("aria-label")).toBe("Mark as not done: Finish lab report");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector(".line-through")).not.toBeNull();
    expect(button.querySelector(".bg-muted-foreground")).not.toBeNull();

    await act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;

    button = await renderTask({ ...defaultTask, due_at: "2000-01-01T00:00:00.000Z" });
    expect(button.className).toContain("text-destructive");
    expect(button.className).not.toContain("line-through");
  });

  it("stops the calendar click and sends the task to the toggle handler", async () => {
    const clicked: CalendarTask[] = [];
    const button = await renderTask(defaultTask, (task) => clicked.push(task));
    let parentClicks = 0;
    document.body.addEventListener("click", () => {
      parentClicks += 1;
    });

    await act(() => button.click());

    expect(clicked).toEqual([defaultTask]);
    expect(parentClicks).toBe(0);
  });
});
