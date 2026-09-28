import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createElement, act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import { testWindow, typeInto } from "./test-dom";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = await import("react-dom/client");
const { default: Calendar } = await import("../Calendar");
const { ThemeProvider } = await import("@/lib/theme");

// Behavioral pin for Calendar's own wiring (editor popover, multi-select
// delete, Space panel), held across the feature-hook extraction.

const SPACE: CalendarCategory = { id: "space-1", name: "School", color: "blue" };

function todayAt(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeEvent(id: string, title: string, hour: number): CalendarEvent {
  return {
    id,
    title,
    start_at: todayAt(hour),
    end_at: todayAt(hour + 1),
    color: null,
    color_overridden: false,
    category_id: SPACE.id,
    location: null,
    icon: null,
  };
}

// Starts today and ends tomorrow, so the week and day views draw it in the all-day row.
const RETREAT: CalendarEvent = {
  ...makeEvent("e3", "Retreat", 9),
  end_at: new Date(new Date(todayAt(9)).getTime() + 25 * 3600_000).toISOString(),
};
const EVENTS = [makeEvent("e1", "Lecture", 9), makeEvent("e2", "Lab", 13), RETREAT];

const ESSAY: CalendarTask = {
  id: "t1",
  title: "Essay draft",
  due_at: todayAt(23),
  completed: false,
  color: null,
  color_overridden: false,
  category_id: SPACE.id,
};
let tasks: CalendarTask[] = [];

type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let patchResponse: { status: number; body: unknown } = { status: 200, body: null };
let deleteStatus = 200;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;
let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  calls = [];
  tasks = [];
  deleteStatus = 200;
  patchResponse = { status: 200, body: { success: true, data: EVENTS[0] } };
  localStorage.clear();
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "GET" && url === "/api/events") return json({ success: true, data: EVENTS });
    if (method === "GET" && url === "/api/tasks") return json({ success: true, data: tasks });
    if (method === "GET" && url === "/api/categories") return json({ success: true, data: [SPACE] });
    if (method === "PATCH") return json(patchResponse.body, patchResponse.status);
    if (method === "DELETE") {
      return deleteStatus === 200
        ? json({ success: true })
        : json({ success: false, error: "Delete failed" }, deleteStatus);
    }
    return json({ success: false, error: `unexpected ${method} ${url}` }, 500);
  }) as unknown as typeof fetch;
});

afterEach(async () => {
  testWindow.happyDOM.setInnerWidth(1024);
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
  globalThis.fetch = originalFetch;
});

async function settle() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  });
}

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(ThemeProvider, null, createElement(Calendar))));
  await settle();
}

async function remount() {
  await act(() => root?.unmount());
  container?.remove();
  await mount();
}

function eventBlock(title: string): HTMLElement {
  const block = [...document.querySelectorAll<HTMLElement>("button[title]")].find(
    (el) => el.getAttribute("title") === title
  );
  if (!block) throw new Error(`no event block titled ${title}`);
  return block;
}

function buttonByText(text: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>("button, [role='menuitem']")].find(
    (el) => el.textContent?.trim() === text
  );
}

async function click(el: Element, init: MouseEventInit = {}) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, ...init }));
  });
  await settle();
}

async function rightClick(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 50, clientY: 50 }));
  });
  await settle();
}

const eventDetails = () => document.querySelector("[aria-label='Event details']");
const createPopover = () => document.querySelector("[role='dialog'][aria-label='Create event']");
const titleField = () => eventDetails()!.querySelector<HTMLInputElement>("#event-inspector-title")!;
const panelOpen = () => document.querySelector("[aria-label='Close panel']") !== null;
/** Selects School in the rail, then opens its Branch from the agenda's Branch list. */
async function openSchoolBranch() {
  await click(document.querySelector("nav [aria-label='School']")!);
  const row = [...document.querySelectorAll<HTMLElement>("button")].find(
    (b) => b.textContent === "School" && b.parentElement?.previousElementSibling?.textContent === "Branches"
  );
  if (!row) throw new Error("no School branch row");
  await click(row);
}

/** Right-clicks the first empty time slot and picks Create event. */
async function createFromSlotMenu() {
  await rightClick(document.querySelector("div[role='button']")!);
  await click(buttonByText("Create event")!);
}

async function switchView(label: string) {
  const btn = [...document.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.endsWith(label));
  if (!btn) throw new Error(`no ${label} view button`);
  await click(btn);
}

// Below 1200px the panel is a modal sheet behind a full-screen scrim button.
const panelIsSheet = () => document.querySelector("button.inset-0[aria-label='Close panel']") !== null;

describe("Calendar behavior", () => {
  describe("event details", () => {
    beforeEach(() => testWindow.happyDOM.setInnerWidth(1300));

    it("clicking an event opens its details in the right panel, not the popover", async () => {
      await mount();
      await click(eventBlock("Lecture"));
      expect(eventDetails()).not.toBeNull();
      expect(createPopover()).toBeNull();
      expect(titleField().value).toBe("Lecture");

      await click(document.querySelector("[aria-label='Close event details']")!);
      expect(eventDetails()).toBeNull();
    });

    const entryPoints: { name: string; open: () => Promise<void> }[] = [
      { name: "the week grid", open: () => click(eventBlock("Lab")) },
      { name: "the all-day row", open: () => click(eventBlock("Retreat")) },
      {
        name: "the day grid",
        open: async () => {
          await switchView("Day");
          await click(eventBlock("Lab"));
        },
      },
      {
        name: "the month grid",
        open: async () => {
          await switchView("Month");
          await click(eventBlock("Lab"));
        },
      },
      {
        name: "the day agenda",
        open: () => click(document.querySelector("[aria-label='Edit event: Lab']")!),
      },
    ];

    for (const { name, open } of entryPoints) {
      it(`an event opened from ${name} shows its details and no popover`, async () => {
        await mount();
        await open();
        expect(eventDetails()).not.toBeNull();
        expect(createPopover()).toBeNull();
      });
    }

    it("creating an event from the context menu still opens the create popover", async () => {
      await mount();
      await createFromSlotMenu();
      expect(createPopover()).not.toBeNull();
      expect(eventDetails()).toBeNull();
    });

    it("opening an event closes an open create popover", async () => {
      await mount();
      await createFromSlotMenu();
      expect(createPopover()).not.toBeNull();

      await click(eventBlock("Lecture"));
      expect(createPopover()).toBeNull();
      expect(eventDetails()).not.toBeNull();
    });

    it("opening another event never shows the previous event's draft", async () => {
      await mount();
      await click(eventBlock("Lecture"));
      await click(eventBlock("Lab"));
      expect(titleField().value).toBe("Lab");
    });

    it("a saved title reaches the server and the calendar", async () => {
      patchResponse = { status: 200, body: { success: true, data: { ...EVENTS[0], title: "Seminar" } } };
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => typeInto(titleField(), "Seminar"));
      await click(buttonByText("Save")!);

      const patch = calls.find((c) => c.method === "PATCH");
      expect(patch?.url).toBe("/api/events/e1");
      expect((patch?.body as { title: string }).title).toBe("Seminar");
      expect(eventBlock("Seminar")).toBeDefined();
    });

    it("a failed save keeps the typed title and offers a retry", async () => {
      patchResponse = { status: 400, body: { success: false, error: "Title is required" } };
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => typeInto(titleField(), "Seminar"));
      await click(buttonByText("Save")!);

      expect(calls.some((c) => c.method === "PATCH" && c.url === "/api/events/e1")).toBe(true);
      expect(eventDetails()).not.toBeNull();
      expect(titleField().value).toBe("Seminar");
      expect(buttonByText("Retry")).toBeDefined();
    });

    it("deleting an event closes its details only after the server confirms", async () => {
      await mount();
      await click(eventBlock("Lecture"));
      await click(buttonByText("Delete")!);
      await click(document.querySelector("[aria-label='Confirm delete'] button")!);

      expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/events/e1")).toBe(true);
      expect(eventDetails()).toBeNull();
      expect(() => eventBlock("Lecture")).toThrow();
    });

    it("a failed delete brings the event back with its details still open", async () => {
      deleteStatus = 500;
      await mount();
      await click(eventBlock("Lecture"));
      await click(buttonByText("Delete")!);
      await click(document.querySelector("[aria-label='Confirm delete'] button")!);

      expect(eventDetails()).not.toBeNull();
      expect(eventBlock("Lecture")).toBeDefined();
    });

    it("unsaved edits hold another selection until the user answers", async () => {
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => typeInto(titleField(), "Seminar"));
      await click(eventBlock("Lab"));

      expect(document.querySelector("[role='alertdialog']")).not.toBeNull();
      expect(titleField().value).toBe("Seminar");

      await click(buttonByText("Discard")!);
      expect(titleField().value).toBe("Lab");
    });
  });

  it("shift-selecting two events offers a bulk delete that deletes both", async () => {
    await mount();
    await click(eventBlock("Lecture"), { shiftKey: true });
    await click(eventBlock("Lab"), { shiftKey: true });
    expect(eventBlock("Lecture").className).toContain("ring-2");
    expect(eventBlock("Lab").className).toContain("ring-2");

    await rightClick(eventBlock("Lab"));
    await click(buttonByText("Delete 2 events")!);
    expect(document.body.textContent).toContain("Delete 2 events?");

    await click(buttonByText("Delete")!);
    const deleted = calls.filter((c) => c.method === "DELETE").map((c) => c.url).sort();
    expect(deleted).toEqual(["/api/events/e1", "/api/events/e2"]);
  });

  it("a plain click on an event clears the multi-selection", async () => {
    await mount();
    await click(eventBlock("Lecture"), { shiftKey: true });
    await click(eventBlock("Lab"));
    expect(eventBlock("Lecture").className).not.toContain("ring-2");
  });

  it("a panel closed before a remount stays closed", async () => {
    await mount();
    await openSchoolBranch();
    await click(document.querySelector("[aria-label='Close panel']")!);
    expect(panelOpen()).toBe(false);

    await remount();
    expect(panelOpen()).toBe(false);
  });

  it("after a remount the panel reopens on the branch that was open", async () => {
    await mount();
    await openSchoolBranch();
    expect(panelOpen()).toBe(true);

    await remount();
    expect(panelOpen()).toBe(true);
    expect(JSON.parse(localStorage.getItem("kalend.branchPanel")!)).toEqual({
      active: { kind: "branch", branchId: "space-1:default", spaceId: "space-1" },
    });
  });

  it("All tasks stays open when another date is selected, and is not restored after a remount", async () => {
    testWindow.happyDOM.setInnerWidth(1300);
    await mount();
    await click(buttonByText("All tasks")!);
    const allTasksPanel = () => document.querySelector("[role='complementary'][aria-label='All tasks']");
    expect(allTasksPanel()).not.toBeNull();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const heading = () => document.querySelector("[data-testid='agenda-column'] h2")?.textContent;
    const before = heading();
    const dayCell = [...document.querySelectorAll<HTMLElement>("button")].find(
      (b) => b.className.includes("w-7 h-7") && b.textContent === String(tomorrow.getDate())
    );
    await click(dayCell!);
    expect(heading()).not.toBe(before);
    expect(allTasksPanel()).not.toBeNull();

    await remount();
    expect(panelOpen()).toBe(false);
  });

  it("the panel is pinned on wide windows and a sheet on narrow ones", async () => {
    testWindow.happyDOM.setInnerWidth(1300);
    await mount();
    await openSchoolBranch();
    expect(panelOpen()).toBe(true);
    expect(panelIsSheet()).toBe(false);

    await act(async () => {
      testWindow.happyDOM.setInnerWidth(1000);
      window.dispatchEvent(new Event("resize"));
    });
    await settle();
    expect(panelIsSheet()).toBe(true);
  });

  describe("task details", () => {
    const openTitles = () =>
      [...document.querySelectorAll<HTMLElement>("button[aria-label^='Open task']")].map(
        (b) => b.textContent
      );
    const inspector = () => document.querySelector("[aria-label='Task details']");

    beforeEach(() => {
      tasks = [ESSAY];
      testWindow.happyDOM.setInnerWidth(1300);
    });

    it("a task title opens its details without completing it", async () => {
      await mount();
      await click(document.querySelector("[aria-label='Open task Essay draft']")!);

      expect(inspector()).not.toBeNull();
      expect(calls.some((c) => c.method === "PATCH")).toBe(false);
    });

    it("a saved title shows in the agenda and the calendar", async () => {
      patchResponse = { status: 200, body: { success: true, data: { ...ESSAY, title: "Essay final" } } };
      await mount();
      await click(document.querySelector("[aria-label='Open task Essay draft']")!);

      const input = inspector()!.querySelector("input")!;
      await act(async () => typeInto(input, "Essay final"));
      await click(buttonByText("Save")!);

      expect(calls.find((c) => c.method === "PATCH")).toEqual({
        url: "/api/tasks/t1",
        method: "PATCH",
        body: { title: "Essay final" },
      });
      // Every rendering of the task (agenda rows, the week view's all-day chip) shows the new title.
      expect(openTitles().length).toBeGreaterThanOrEqual(2);
      expect(new Set(openTitles())).toEqual(new Set(["Essay final"]));
    });

    it("unsaved edits hold another selection until the user discards them", async () => {
      await mount();
      await click(document.querySelector("[aria-label='Open task Essay draft']")!);
      await act(async () => typeInto(inspector()!.querySelector("input")!, "Essay v2"));

      await click(buttonByText("All tasks")!);
      expect(inspector()).not.toBeNull();
      expect(document.querySelector("[role='alertdialog']")).not.toBeNull();

      await click(buttonByText("Discard")!);
      expect(inspector()).toBeNull();
      expect(document.querySelector("[role='complementary'][aria-label='All tasks']")).not.toBeNull();
    });

    it("deleting a task closes its details and removes it everywhere", async () => {
      await mount();
      await click(document.querySelector("[aria-label='Open task Essay draft']")!);
      await click(buttonByText("Delete")!);
      await click(document.querySelector("[aria-label='Confirm delete'] button")!);

      expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/tasks/t1")).toBe(true);
      expect(inspector()).toBeNull();
      expect(openTitles()).toEqual([]);
    });

    it("a failed delete brings the task back with its details still open", async () => {
      deleteStatus = 500;
      await mount();
      await click(document.querySelector("[aria-label='Open task Essay draft']")!);
      await click(buttonByText("Delete")!);
      await click(document.querySelector("[aria-label='Confirm delete'] button")!);

      expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/tasks/t1")).toBe(true);
      expect(inspector()).not.toBeNull();
      expect(openTitles()).toContain("Essay draft");
    });

    it("Delete is unavailable while the unsaved-edits prompt is showing", async () => {
      await mount();
      await click(document.querySelector("[aria-label='Open task Essay draft']")!);
      await act(async () => typeInto(inspector()!.querySelector("input")!, "Essay v2"));
      await click(buttonByText("All tasks")!);

      expect(document.querySelector("[role='alertdialog']")).not.toBeNull();
      expect((buttonByText("Delete") as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
