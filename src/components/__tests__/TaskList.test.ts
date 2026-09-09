import { afterEach, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import TaskList from "../TaskList";

const window = new Window({ url: "http://localhost" });
const browserGlobals = [
  "document",
  "HTMLElement",
  "HTMLDivElement",
  "Node",
  "Text",
  "Element",
  "DocumentFragment",
  "navigator",
  "MutationObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Event",
  "MouseEvent",
  "CustomEvent",
  "localStorage",
] as const;

(globalThis as Record<string, unknown>).window = window;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
for (const key of browserGlobals) {
  (globalThis as Record<string, unknown>)[key] = (
    window as unknown as Record<string, unknown>
  )[key];
}

const categories = [
  { id: "space-1", name: "Work", color: "green" },
  { id: "space-2", name: "Personal", color: "purple" },
];

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

describe("TaskList focused creation", () => {
  it("snapshots focus when the draft opens and uses the latest focus for the next draft", async () => {
    localStorage.setItem("kalend:tasks-panel-collapsed", "false");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const onCreateTask = async (_title: string, _dueAt?: string, categoryId?: string | null) => {
      void categoryId;
    };
    const render = (selectedSpaceId: string | null) =>
      root?.render(createElement(TaskList, {
        tasks: [],
        loading: false,
        categories,
        selectedSpaceId,
        onCreateTask,
        onToggleComplete: () => {},
        onDeleteTask: () => {},
      }));

    await act(() => render("space-1"));
    const addDraft = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Add a task")
    );
    expect(addDraft?.textContent).toContain("Add a task");
    await act(() => addDraft?.click());
    expect(document.querySelector('[aria-label="Space: Work"]')).not.toBeNull();

    await act(() => render("space-2"));
    expect(document.querySelector('[aria-label="Space: Work"]')).not.toBeNull();

    await act(() => document.querySelector<HTMLButtonElement>('[aria-label="Cancel"]')?.click());
    const nextDraft = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Add a task"));
    await act(() => nextDraft?.click());
    expect(document.querySelector('[aria-label="Space: Personal"]')).not.toBeNull();
  });
});
