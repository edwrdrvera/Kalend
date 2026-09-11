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

function pressKey(element: HTMLElement, key: string) {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

function agendaToggle() {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
    button.textContent?.includes("Agenda")
  );
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
  it("uses the custom date picker for a task due date", async () => {
    localStorage.setItem("kalend:tasks-panel-collapsed", "false");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [],
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]')?.click()
    );
    const dueDateToggle = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.trim() === "+ due date"
    );
    await act(() => dueDateToggle?.click());

    expect(document.querySelector('[aria-label^="Due date,"]')).not.toBeNull();
    expect(document.querySelector('input[type="date"]')).toBeNull();
    expect(document.querySelector('[aria-label="New task title"]')).not.toBeNull();
  });

  it("preserves a nonempty draft on outside dismissal and restores it", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [],
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]')?.click()
    );
    const input = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!input) throw new Error("Task title input was not rendered");
    await act(() => typeInto(input, "Keep this draft"));
    const outsideTarget = agendaToggle();
    if (!outsideTarget) throw new Error("Agenda toggle was not rendered");
    await act(() => outsideTarget.click());

    expect(document.querySelector('[aria-label="New task title"]')).toBeNull();
    expect(document.querySelector('[aria-label="Task draft saved"]')).not.toBeNull();

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]')?.click()
    );
    expect(document.querySelector<HTMLInputElement>('[aria-label="New task title"]')?.value)
      .toBe("Keep this draft");
  });

  it("discards the draft on Escape", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [],
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]')?.click()
    );
    const input = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!input) throw new Error("Task title input was not rendered");
    await act(() => typeInto(input, "Discard this draft"));
    await act(() => pressKey(input, "Escape"));

    expect(document.querySelector('[aria-label="New task title"]')).toBeNull();
    expect(document.querySelector('[aria-label="Task draft saved"]')).toBeNull();
  });

  it("closes an empty composer without saving a draft", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [],
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]')?.click()
    );
    const outsideTarget = agendaToggle();
    if (!outsideTarget) throw new Error("Agenda toggle was not rendered");
    await act(() => outsideTarget.click());

    expect(document.querySelector('[aria-label="New task title"]')).toBeNull();
    expect(document.querySelector('[aria-label="Task draft saved"]')).toBeNull();
  });

  it("discards the draft from Cancel", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [],
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]')?.click()
    );
    const input = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!input) throw new Error("Task title input was not rendered");
    await act(() => typeInto(input, "Discard this draft"));
    const cancel = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.trim() === "Cancel"
    );
    await act(() => cancel?.click());

    expect(document.querySelector('[aria-label="New task title"]')).toBeNull();
    expect(document.querySelector('[aria-label="Task draft saved"]')).toBeNull();
  });

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
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId,
        onCreateTask,
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }));

    await act(() => render("space-1"));
    const addDraft = document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]');
    expect(addDraft).not.toBeNull();
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

    const nextDraft = document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]');
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
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: "space-1",
        onCreateTask: async (title, dueAt, categoryId) => {
          submissions.push({ title, dueAt, categoryId });
        },
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    const addDraft = document.querySelector<HTMLButtonElement>('[aria-label="Create a task"]');
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

describe("TaskList agenda interactions", () => {
  it("opens automatically for active items and honors a saved collapsed preference", async () => {
    const task = {
      id: "task-1",
      title: "Finish lab report",
      due_at: new Date(2030, 8, 9, 23, 59).toISOString(),
      completed: false,
      color: "blue",
      color_overridden: true,
      category_id: null,
    };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const render = () =>
      root?.render(createElement(TaskList, {
        tasks: [task],
        events: [],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }));

    await act(render);
    expect(agendaToggle()?.getAttribute("aria-expanded")).toBe("true");

    await act(() => agendaToggle()?.click());
    expect(localStorage.getItem("kalend:tasks-panel-collapsed")).toBe("true");
    expect(agendaToggle()?.getAttribute("aria-expanded")).toBe("false");

    await act(() => root?.unmount());
    root = createRoot(container);
    await act(render);
    expect(agendaToggle()?.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows active and overdue counts in the Agenda header", async () => {
    const selectedDate = new Date(2030, 8, 9, 12);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [
          {
            id: "active",
            title: "Active task",
            due_at: new Date(2030, 8, 9, 23, 59).toISOString(),
            completed: false,
            color: "blue",
            color_overridden: true,
            category_id: null,
          },
          {
            id: "overdue",
            title: "Overdue task",
            due_at: new Date(2020, 8, 8, 23, 59).toISOString(),
            completed: false,
            color: "blue",
            color_overridden: true,
            category_id: null,
          },
        ],
        events: [],
        selectedDate,
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: () => {},
        onDeleteTask: () => {},
        onEventClick: () => {},
      }))
    );

    expect(document.querySelector('[aria-label="1 active agenda item"]')).not.toBeNull();
    expect(agendaToggle()?.textContent).toContain("1 overdue");
  });

  it("opens an event editor and preserves task completion and deletion actions", async () => {
    localStorage.setItem("kalend:tasks-panel-collapsed", "false");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const event = {
      id: "event-1",
      title: "Biology lecture",
      start_at: new Date(2030, 8, 9, 9).toISOString(),
      end_at: new Date(2030, 8, 9, 10).toISOString(),
      color: "blue",
      color_overridden: true,
      category_id: null,
    };
    const task = {
      id: "task-1",
      title: "Finish lab report",
      due_at: new Date(2030, 8, 9, 23, 59).toISOString(),
      completed: false,
      color: "blue",
      color_overridden: true,
      category_id: null,
    };
    const opened: string[] = [];
    const toggled: string[] = [];
    const deleted: string[] = [];

    await act(() =>
      root?.render(createElement(TaskList, {
        tasks: [task],
        events: [event],
        selectedDate: new Date(2030, 8, 9),
        loading: false,
        categories,
        selectedSpaceId: null,
        onCreateTask: async () => {},
        onToggleComplete: (selectedTask) => toggled.push(selectedTask.id),
        onDeleteTask: (selectedTask) => deleted.push(selectedTask.id),
        onEventClick: (selectedEvent, rect) => {
          opened.push(selectedEvent.id);
          expect(rect.top).toBeNumber();
        },
      }))
    );

    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Edit event: Biology lecture"]')?.click()
    );
    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Mark as done"]')?.click()
    );
    await act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Delete task"]')?.click()
    );

    expect(opened).toEqual(["event-1"]);
    expect(toggled).toEqual(["task-1"]);
    expect(deleted).toEqual(["task-1"]);
  });
});
