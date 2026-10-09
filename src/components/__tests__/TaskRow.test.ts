import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TaskRow } = await import("../TaskRow");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const TASK: CalendarTask = {
  id: "t1",
  title: "Read chapter 5",
  due_at: "2000-01-01T12:00:00.000Z",
  completed: false,
  color: "green",
  color_overridden: false,
  category_id: null,
  group_id: null,
};

async function render(task: CalendarTask, toggled: string[] = []) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(TaskRow, {
        task,
        categories: [],
        onToggleTaskComplete: (t: CalendarTask) => toggled.push(t.id),
        onOpenTask: () => {},
      })
    )
  );
  return container;
}

describe("TaskRow", () => {
  it("swaps the color dot for an alert icon on an overdue task and keeps Overdue in its name", async () => {
    const el = await render(TASK);
    expect(el.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
    expect(el.querySelector('[class*="evt-green-solid"]')).toBeNull();
    expect(el.querySelector(`button[aria-label^="Open task"]`)?.getAttribute("aria-label")).toBe("Open task Read chapter 5, Overdue");
  });

  it("shows the 6px color dot and no Overdue for a task that is not late", async () => {
    const el = await render({ ...TASK, due_at: null });
    expect(el.querySelector("svg.lucide-triangle-alert")).toBeNull();
    expect(el.querySelector('[class*="evt-green-solid"]')?.className).toContain("size-1.5");
    expect(el.querySelector(`button[aria-label^="Open task"]`)?.getAttribute("aria-label")).toBe("Open task Read chapter 5");
  });

  it("completes through its checkbox", async () => {
    const toggled: string[] = [];
    const el = await render(TASK, toggled);
    const box = el.querySelector<HTMLElement>('[role="checkbox"]')!;
    expect(box.getAttribute("aria-checked")).toBe("false");
    await act(() => box.click());
    expect(toggled).toEqual(["t1"]);
  });
});
