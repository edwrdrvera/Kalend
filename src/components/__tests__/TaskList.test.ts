import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TaskList } = await import("../TaskList");

const categories = [
  { id: "space-1", name: "Work", color: "green" },
  { id: "space-2", name: "Personal", color: "purple" },
];

interface Submission {
  title: string;
  dueAt: string | undefined;
  categoryId: string | null | undefined;
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

describe("TaskList focused creation", () => {
  it("submits the snapshotted Space after focus changes and uses the latest focus for the next draft", async () => {
    localStorage.setItem("kalend:tasks-panel-collapsed", "false");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const submissions: Submission[] = [];
    const onCreateTask = async (title: string, dueAt?: string, categoryId?: string | null) => {
      submissions.push({ title, dueAt, categoryId });
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

    const titleInput = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!titleInput) throw new Error("Task title input was not rendered");
    await act(() => typeInto(titleInput, "Prepare agenda"));
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Add task"]')?.click()
    );
    expect(submissions).toEqual([
      { title: "Prepare agenda", dueAt: undefined, categoryId: "space-1" },
    ]);

    const nextDraft = [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Add a task")
    );
    await act(() => nextDraft?.click());
    expect(document.querySelector('[aria-label="Space: Personal"]')).not.toBeNull();
  });

  it("submits null after explicitly choosing No Space from a focused draft", async () => {
    localStorage.setItem("kalend:tasks-panel-collapsed", "false");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const submissions: Submission[] = [];
    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [],
        loading: false,
        categories,
        selectedSpaceId: "space-1",
        onCreateTask: async (title, dueAt, categoryId) => {
          submissions.push({ title, dueAt, categoryId });
        },
        onToggleComplete: () => {},
        onDeleteTask: () => {},
      }))
    );

    const addDraft = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.trim() === "Add a task"
    );
    if (!addDraft) throw new Error("Add a task button was not rendered");
    await act(() => addDraft.click());
    const spaceSelector = document.querySelector<HTMLButtonElement>('[aria-label="Space: Work"]');
    if (!spaceSelector) throw new Error("Focused Space selector was not rendered");
    await act(() => spaceSelector.click());
    const noSpace = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.trim() === "No Space"
    );
    if (!noSpace) throw new Error("No Space option was not rendered");
    await act(() => noSpace.click());
    expect(document.querySelector('[aria-label="Space: No Space"]')).not.toBeNull();

    const titleInput = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!titleInput) throw new Error("Task title input was not rendered");
    await act(() => typeInto(titleInput, "Plan weekend"));
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="Add task"]')?.click()
    );
    expect(submissions).toEqual([{ title: "Plan weekend", dueAt: undefined, categoryId: null }]);
  });
});
