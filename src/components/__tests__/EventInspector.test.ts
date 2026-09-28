import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement, useReducer, useState } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";
import { branchPanelReducer, initialBranchPanelState } from "@/lib/branch-panel-state";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: EventInspector } = await import("../EventInspector");

const CATEGORIES: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green" },
  { id: "space-2", name: "Personal", color: "purple" },
];

const EVENT: CalendarEvent = {
  id: "event-1",
  title: "Standup",
  start_at: "2026-09-09T14:00:00.000Z",
  end_at: "2026-09-09T15:00:00.000Z",
  color: "blue",
  color_overridden: false,
  category_id: "space-1",
  location: "Room 204",
  icon: "🧪",
};

let root: Root | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

interface Harness {
  saves: EventFormValues[];
  deletes: string[];
  /** What the next save resolves to. */
  saveResult: boolean;
}

// Wires the inspector to the real panel reducer the way Calendar does, plus
// an outside control that requests a close.
async function renderInspector() {
  const harness: Harness = { saves: [], deletes: [], saveResult: true };

  function App() {
    const [event, setEvent] = useState(EVENT);
    const [panel, dispatch] = useReducer(branchPanelReducer, {
      ...initialBranchPanelState,
      active: { kind: "event", eventId: EVENT.id, from: null },
    });
    return createElement(
      "div",
      null,
      createElement("button", { type: "button", onClick: () => dispatch({ type: "close" }) }, "Outside close"),
      createElement("output", { "data-testid": "panel" }, panel.active ? "open" : "closed"),
      panel.active &&
        createElement(EventInspector, {
          key: event.id,
          event,
          categories: CATEGORIES,
          modal: false,
          nav: { space: null, back: null },
          onClose: () => dispatch({ type: "close" }),
          onSave: async (e, values) => {
            harness.saves.push(values);
            if (harness.saveResult) {
              setEvent({
                ...e,
                title: values.title,
                start_at: values.startAt,
                end_at: values.endAt,
                category_id: values.categoryId,
                location: values.location,
                icon: values.icon,
              });
            }
            return harness.saveResult;
          },
          onDelete: (e) => harness.deletes.push(e.id),
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

const input = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`)!;
const titleInput = () => input("event-inspector-title");
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
const spaceLabel = () => document.querySelector('[aria-label^="Space: "]')?.getAttribute("aria-label");

async function editTitle(value: string) {
  await act(() => typeInto(titleInput(), value));
}

describe("EventInspector", () => {
  it("shows the event's own fields and Space", async () => {
    await renderInspector();
    expect(titleInput().value).toBe("Standup");
    expect(input("event-inspector-icon").value).toBe("🧪");
    expect(document.querySelector<HTMLInputElement>('[aria-label="Start time"]')).not.toBeNull();
    expect([...document.querySelectorAll("input")].some((i) => i.value === "Room 204")).toBe(true);
    expect(spaceLabel()).toBe("Space: Work");
  });

  it("without a Space, the breadcrumb is just the saved title and there is no Back", async () => {
    await renderInspector();
    await editTitle("Retro");
    const crumbs = document.querySelector("nav[aria-label='Breadcrumb']");
    expect(crumbs?.textContent).toBe("Standup");
    expect(crumbs?.querySelector("button")).toBeNull();
    expect(document.querySelector("[aria-label^='Back to']")).toBeNull();
  });

  it("disables Save until something changes, then saves every field and becomes clean", async () => {
    const harness = await renderInspector();
    expect(button("Save")?.disabled).toBe(true);
    await editTitle("  Retro ");
    await click("Save");

    expect(harness.saves).toEqual([
      {
        title: "Retro",
        startAt: EVENT.start_at,
        endAt: EVENT.end_at,
        color: "blue",
        colorOverridden: false,
        categoryId: "space-1",
        location: "Room 204",
        icon: "🧪",
      },
    ]);
    expect(button("Save")?.disabled).toBe(true);
    expect(alertText()).toBe("");
  });

  it("moves the event to another Space", async () => {
    const harness = await renderInspector();
    await act(() => document.querySelector<HTMLElement>('[aria-label^="Space: "]')?.click());
    const personal = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="popover-content"] button')].find(
      (b) => b.textContent?.trim() === "Personal"
    );
    await act(() => personal?.click());
    await click("Save");
    expect(harness.saves[0]?.categoryId).toBe("space-2");
  });

  it("refuses to save an end that is not after the start", async () => {
    const harness = await renderInspector();
    const startTime = document.querySelector<HTMLInputElement>('[aria-label="Start time"]')!.value;
    await act(() => typeInto(document.querySelector<HTMLInputElement>('[aria-label="End time"]')!, startTime));
    await click("Save");
    expect(harness.saves).toEqual([]);
    expect(alertText()).toBe("Start must be before end.");
  });

  it("keeps the typed values and offers a retry when the save fails", async () => {
    const harness = await renderInspector();
    harness.saveResult = false;
    await editTitle("Retro");
    await click("Save");

    expect(titleInput().value).toBe("Retro");
    expect(alertText()).toContain("Couldn't save");

    harness.saveResult = true;
    await click("Retry");
    expect(harness.saves).toHaveLength(2);
    expect(alertText()).toBe("");
  });

  it("holds a close with unsaved edits until Discard", async () => {
    const harness = await renderInspector();
    await editTitle("Retro");
    await click("Outside close");
    expect(panelState()).toBe("open");
    expect(prompt()?.textContent).toContain("unsaved changes to this event");

    await click("Discard");
    expect(panelState()).toBe("closed");
    expect(harness.saves).toEqual([]);
  });

  it("Save in the prompt stays open with the error when the save fails", async () => {
    const harness = await renderInspector();
    harness.saveResult = false;
    await editTitle("Retro");
    await click("Close event details");
    await act(async () => {
      prompt()?.querySelector("button")?.click();
    });

    expect(panelState()).toBe("open");
    expect(titleInput().value).toBe("Retro");
    expect(alertText()).toContain("Couldn't save");
  });

  it("deletes only after confirming, and not while the prompt is showing", async () => {
    const harness = await renderInspector();
    await click("Delete");
    expect(harness.deletes).toEqual([]);
    await act(() => {
      document.querySelector<HTMLElement>('[aria-label="Confirm delete"] button')?.click();
    });
    expect(harness.deletes).toEqual([EVENT.id]);

    await editTitle("Retro");
    await click("Outside close");
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Confirm delete"] button')?.disabled).toBe(true);
  });
});
