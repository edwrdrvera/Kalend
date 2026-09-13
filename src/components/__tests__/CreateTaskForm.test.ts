import { afterEach, describe, expect, it } from "bun:test";
import { createElement, useState } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory } from "@/lib/calendar-types";
import type { TaskDraft } from "../AgendaSummary";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { CreateTaskForm, newTaskDraft } = await import("../AgendaSummary");

const categories: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green" },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

interface RenderOptions {
  draft: TaskDraft;
  onCreateTask?: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
}

/** Wraps CreateTaskForm with real React state so typing/toggling in the
 *  form actually re-renders it, the way its parent (AgendaSummary /
 *  TaskCreatePopover) does. */
function Harness({
  initialDraft,
  onCreateTask,
}: {
  initialDraft: TaskDraft;
  onCreateTask: NonNullable<RenderOptions["onCreateTask"]>;
}) {
  const [draft, setDraft] = useState(initialDraft);
  return createElement(CreateTaskForm, {
    draft,
    onDraftChange: setDraft,
    onDiscard: () => {},
    onSubmitted: () => {},
    categories,
    onCreateTask,
  });
}

async function renderForm({ draft, onCreateTask = async () => {} }: RenderOptions) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(createElement(Harness, { initialDraft: draft, onCreateTask }))
  );
}

async function submitForm() {
  await act(() =>
    document
      .querySelector<HTMLFormElement>("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  );
}

describe("CreateTaskForm with an initial due date", () => {
  it("shows a pre-populated date field instead of the + due date toggle", async () => {
    const draft = newTaskDraft("space-1", "2030-09-15");
    await renderForm({ draft });

    expect(document.querySelector('[aria-label="Remove due date"]')).not.toBeNull();
    const dateTrigger = document.querySelector('[aria-label^="Due date"]');
    expect(dateTrigger).not.toBeNull();
    expect(dateTrigger?.textContent).toContain("Sep 15, 2030");

    // The "+ due date" toggle should not be present since the date is
    // already shown.
    const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(buttons).not.toContain("+ due date");
  });

  it("submits the pre-filled due date as an end-of-day UTC ISO string", async () => {
    let submittedDueAt: string | undefined;
    const draft = newTaskDraft("space-1", "2030-09-15");
    await renderForm({
      draft,
      onCreateTask: async (_title, dueAt) => {
        submittedDueAt = dueAt;
      },
    });

    const titleInput = document.querySelector<HTMLInputElement>('[aria-label="New task title"]');
    if (!titleInput) throw new Error("Task title input was not rendered");
    await act(() => typeInto(titleInput, "Finish reading"));
    await submitForm();

    expect(submittedDueAt).toBe("2030-09-15T23:59:00.000Z");
  });
});
