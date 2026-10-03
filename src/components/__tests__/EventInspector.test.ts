import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement, useEffect, useReducer, useState } from "react";
import type { Root } from "react-dom/client";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";
import { branchPanelReducer, initialBranchPanelState } from "@/lib/branch-panel-state";
import { chooseOption, typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: EventInspector } = await import("../EventInspector");

const CATEGORIES: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green", description: null },
  { id: "space-2", name: "Personal", color: "purple", description: null },
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
  description: null,
};

let root: Root | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

interface Harness {
  /** The event values each save sent. Null means only the alert changed. */
  saves: (EventFormValues | null)[];
  /** The alert each save asked for. */
  alertSaves: (AlertOffset | null)[];
  deletes: string[];
  saveResult: boolean;
  setEvent: (event: CalendarEvent) => void;
}

async function renderInspector(initialAlert: AlertOffset | null = null) {
  const harness: Harness = { saves: [], alertSaves: [], deletes: [], saveResult: true, setEvent: () => {} };

  function App() {
    const [event, setEvent] = useState(EVENT);
    const [alertOffset, setAlertOffset] = useState<AlertOffset | null>(initialAlert);
    useEffect(() => {
      harness.setEvent = setEvent;
    }, []);
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
          alertOffset,
          categories: CATEGORIES,
          modal: false,
          nav: { space: null, back: null },
          onClose: () => dispatch({ type: "close" }),
          onSave: async (e, values, wantedAlert) => {
            harness.saves.push(values);
            harness.alertSaves.push(wantedAlert);
            if (harness.saveResult) {
              if (values) {
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
              setAlertOffset(wantedAlert);
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

  it("follows the event when it moves elsewhere, keeping an edited title", async () => {
    const harness = await renderInspector();
    await editTitle("Retro");
    await act(async () =>
      harness.setEvent({ ...EVENT, start_at: "2026-09-09T16:00:00.000Z", end_at: "2026-09-09T17:00:00.000Z" })
    );
    expect(titleInput().value).toBe("Retro");
    await click("Save");
    expect(harness.saves.at(-1)?.startAt).toBe("2026-09-09T16:00:00.000Z");
    expect(harness.saves.at(-1)?.title).toBe("Retro");
  });

  describe("alert", () => {
    const alertSelect = () => document.querySelector<HTMLSelectElement>("#event-inspector-alert")!;

    it("offers none and the five offsets under a visible Alert label, defaulting to none", async () => {
      await renderInspector();
      expect(document.querySelector('label[for="event-inspector-alert"]')?.textContent).toBe("Alert");
      expect([...alertSelect().options].map((o) => o.textContent)).toEqual([
        "None",
        "At the time",
        "5 min before",
        "15 min before",
        "1 hour before",
        "1 day before",
      ]);
      expect(alertSelect().value).toBe("");
      expect(alertSelect().disabled).toBe(false);
    });

    it("sets an alert, and an alert-only change does not resend the event", async () => {
      const harness = await renderInspector();
      await act(() => chooseOption(alertSelect(), "15"));
      expect(button("Save")?.disabled).toBe(false);
      await click("Save");

      expect(harness.saves).toEqual([null]);
      expect(harness.alertSaves).toEqual([15]);
      expect(alertSelect().value).toBe("15");
      expect(button("Save")?.disabled).toBe(true);
    });

    it("sends the event fields and the alert together when both changed", async () => {
      const harness = await renderInspector();
      await editTitle("Retro");
      await act(() => chooseOption(alertSelect(), "60"));
      await click("Save");
      expect(harness.saves[0]?.title).toBe("Retro");
      expect(harness.alertSaves).toEqual([60]);
    });

    it("shows the stored alert, changes it, and clears it", async () => {
      const harness = await renderInspector(60);
      expect(alertSelect().value).toBe("60");
      expect(button("Save")?.disabled).toBe(true);

      await act(() => chooseOption(alertSelect(), "5"));
      await click("Save");
      expect(alertSelect().value).toBe("5");

      await act(() => chooseOption(alertSelect(), ""));
      await click("Save");
      expect(harness.alertSaves).toEqual([5, null]);
      expect(alertSelect().value).toBe("");
      expect(button("Save")?.disabled).toBe(true);
    });

    it("counts an alert change as an unsaved edit when closing", async () => {
      const harness = await renderInspector();
      await act(() => chooseOption(alertSelect(), "0"));
      await click("Outside close");
      expect(panelState()).toBe("open");
      expect(prompt()?.textContent).toContain("unsaved changes to this event");

      await act(async () => {
        prompt()?.querySelector("button")?.click();
      });
      expect(harness.alertSaves).toEqual([0]);
      expect(panelState()).toBe("closed");
    });

    it("keeps the chosen alert and offers a retry when the save fails", async () => {
      const harness = await renderInspector();
      harness.saveResult = false;
      await act(() => chooseOption(alertSelect(), "1440"));
      await click("Save");
      expect(alertSelect().value).toBe("1440");
      expect(alertText()).toContain("Couldn't save");

      harness.saveResult = true;
      await click("Retry");
      expect(harness.alertSaves).toEqual([1440, 1440]);
      expect(alertText()).toBe("");
    });

    it("keeps a chosen alert when the event moves elsewhere", async () => {
      const harness = await renderInspector();
      await act(() => chooseOption(alertSelect(), "5"));
      await act(async () =>
        harness.setEvent({ ...EVENT, start_at: "2026-09-09T16:00:00.000Z", end_at: "2026-09-09T17:00:00.000Z" })
      );
      expect(alertSelect().value).toBe("5");
    });
  });

  it("stays clean when an unedited event moves elsewhere", async () => {
    const harness = await renderInspector();
    await act(async () =>
      harness.setEvent({ ...EVENT, start_at: "2026-09-09T16:00:00.000Z", end_at: "2026-09-09T17:00:00.000Z" })
    );
    expect(button("Save")?.disabled).toBe(true);
  });
});
