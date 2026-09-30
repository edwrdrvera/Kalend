import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement, useReducer, useState } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask, TaskPatchRequest } from "@/lib/calendar-types";
import { branchPanelReducer, initialBranchPanelState } from "@/lib/branch-panel-state";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: TaskInspector } = await import("../TaskInspector");

const TASK: CalendarTask = {
  id: "task-1",
  title: "Finish lab report",
  due_at: null,
  completed: false,
  color: null,
  color_overridden: false,
  category_id: null,
};

let root: Root | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

interface Harness {
  saves: TaskPatchRequest[];
  toggles: string[];
  deletes: string[];
  /** What the next save resolves to. */
  saveResult: boolean;
}

// Wires the inspector to the real panel reducer and a single tasks state,
// the way Calendar does, plus an outside control that requests a close.
async function renderInspector() {
  const harness: Harness = { saves: [], toggles: [], deletes: [], saveResult: true };

  function App() {
    const [task, setTask] = useState(TASK);
    const [panel, dispatch] = useReducer(branchPanelReducer, {
      ...initialBranchPanelState,
      active: { kind: "task", taskId: TASK.id, from: null },
    });
    return createElement(
      "div",
      null,
      createElement("button", { type: "button", onClick: () => dispatch({ type: "close" }) }, "Outside close"),
      createElement("output", { "data-testid": "panel" }, panel.active ? "open" : "closed"),
      panel.active &&
        createElement(TaskInspector, {
          key: task.id,
          task,
          categories: [],
          modal: false,
          nav: { space: null, back: null },
          onClose: () => dispatch({ type: "close" }),
          onSave: async (t, patch) => {
            harness.saves.push(patch);
            if (harness.saveResult) setTask({ ...t, ...patch });
            return harness.saveResult;
          },
          onToggleComplete: (t) => harness.toggles.push(t.id),
          onDelete: (t) => harness.deletes.push(t.id),
          onDirtyChange: (dirty) => dispatch({ type: "setDirty", dirty }),
          navigationPending: panel.pending !== null,
          onProceed: () => dispatch({ type: "proceed" }),
          onStay: () => dispatch({ type: "stay" }),
        })
    );
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(App)));
  return harness;
}

const titleInput = () => document.querySelector<HTMLInputElement>("input")!;
const button = (name: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => b.getAttribute("aria-label") === name || b.textContent?.trim() === name
  ) as HTMLButtonElement | undefined;
const click = (name: string) =>
  act(async () => {
    const b = button(name);
    if (!b) throw new Error(`No button named ${name}`);
    b.click();
  });
const panelState = () => document.querySelector("[data-testid=panel]")?.textContent;
const prompt = () => document.querySelector('[role="alertdialog"]');
const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? "";

async function editTitle(value: string) {
  await act(() => typeInto(titleInput(), value));
}

describe("TaskInspector", () => {
  it("disables Save until something changes", async () => {
    await renderInspector();
    expect(button("Save")?.disabled).toBe(true);
    await editTitle("Finish lab report v2");
    expect(button("Save")?.disabled).toBe(false);
  });

  it("saves only the changed fields and becomes clean", async () => {
    const harness = await renderInspector();
    await editTitle("  Submit lab report ");
    await click("Save");

    expect(harness.saves).toEqual([{ title: "Submit lab report" }]);
    expect(button("Save")?.disabled).toBe(true);
    expect(alertText()).toBe("");
  });

  it("keeps the typed values and offers a retry when the save fails", async () => {
    const harness = await renderInspector();
    harness.saveResult = false;
    await editTitle("Submit lab report");
    await click("Save");

    expect(titleInput().value).toBe("Submit lab report");
    expect(alertText()).toContain("Couldn't save");
    expect(button("Retry")?.disabled).toBe(false);

    harness.saveResult = true;
    await click("Retry");
    expect(harness.saves).toHaveLength(2);
    expect(alertText()).toBe("");
  });

  it("closes right away when there are no edits", async () => {
    await renderInspector();
    await click("Close task details");
    expect(panelState()).toBe("closed");
  });

  it("asks Save, Discard, or Stay before closing with unsaved edits", async () => {
    await renderInspector();
    await editTitle("Submit lab report");
    await click("Close task details");

    expect(panelState()).toBe("open");
    expect(prompt()).not.toBeNull();
    expect(button("Discard")).toBeDefined();
    expect(button("Stay")).toBeDefined();
  });

  it("holds a close requested from outside the panel, too", async () => {
    await renderInspector();
    await editTitle("Submit lab report");
    await click("Outside close");
    expect(panelState()).toBe("open");
    expect(prompt()).not.toBeNull();
  });

  it("Discard closes without saving", async () => {
    const harness = await renderInspector();
    await editTitle("Submit lab report");
    await click("Close task details");
    await click("Discard");

    expect(panelState()).toBe("closed");
    expect(harness.saves).toEqual([]);
  });

  it("Stay keeps the panel and the edits", async () => {
    await renderInspector();
    await editTitle("Submit lab report");
    await click("Close task details");
    await click("Stay");

    expect(panelState()).toBe("open");
    expect(prompt()).toBeNull();
    expect(titleInput().value).toBe("Submit lab report");
  });

  it("Escape on the prompt means Stay", async () => {
    await renderInspector();
    await editTitle("Submit lab report");
    await click("Close task details");
    await act(() => {
      prompt()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(panelState()).toBe("open");
    expect(prompt()).toBeNull();
  });

  it("Save in the prompt saves, then closes", async () => {
    const harness = await renderInspector();
    await editTitle("Submit lab report");
    await click("Close task details");
    await act(async () => {
      prompt()?.querySelector("button")?.click();
    });

    expect(harness.saves).toEqual([{ title: "Submit lab report" }]);
    expect(panelState()).toBe("closed");
  });

  it("Save in the prompt stays open with the error when the save fails", async () => {
    const harness = await renderInspector();
    harness.saveResult = false;
    await editTitle("Submit lab report");
    await click("Close task details");
    await act(async () => {
      prompt()?.querySelector("button")?.click();
    });

    expect(panelState()).toBe("open");
    expect(prompt()).toBeNull();
    expect(titleInput().value).toBe("Submit lab report");
    expect(alertText()).toContain("Couldn't save");
  });

  it("clears the due date through its own control", async () => {
    const saves: TaskPatchRequest[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(() =>
      root?.render(
        createElement(TaskInspector, {
          task: { ...TASK, due_at: "2026-10-01T23:59:00" },
          categories: [],
          modal: false,
          nav: { space: null, back: null },
          onClose: () => {},
          onSave: async (_t, patch) => {
            saves.push(patch);
            return true;
          },
          onToggleComplete: () => {},
          onDelete: () => {},
          onDirtyChange: () => {},
          navigationPending: false,
          onProceed: () => {},
          onStay: () => {},
        })
      )
    );
    await click("Clear due date");
    await click("Save");
    expect(saves).toEqual([{ due_at: null }]);
  });

  it("completes only through the Done checkbox, and deletes only after confirming", async () => {
    const harness = await renderInspector();
    await act(() => document.querySelector<HTMLElement>('[role="checkbox"]')?.click());
    expect(harness.toggles).toEqual([TASK.id]);

    await click("Delete");
    expect(harness.deletes).toEqual([]);
    await act(() => {
      document.querySelector<HTMLElement>('[aria-label="Confirm delete"] button')?.click();
    });
    expect(harness.deletes).toEqual([TASK.id]);
  });
});
