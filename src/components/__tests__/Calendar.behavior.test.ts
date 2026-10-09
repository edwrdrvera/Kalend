import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createElement, act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarAlert, CalendarCategory, CalendarEvent, CalendarGroup, CalendarTask } from "@/lib/calendar-types";
import { chooseOption, testWindow, typeInto } from "./test-dom";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = await import("react-dom/client");
const { default: Calendar } = await import("../Calendar");
const { ThemeProvider } = await import("@/lib/theme");

// Behavioral pin for Calendar's own wiring (editor popover, multi-select
// delete, Space panel), held across the feature-hook extraction.

const SPACE: CalendarCategory = { id: "space-1", name: "School", color: "blue", description: null };

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
    group_id: null,
    location: null,
    icon: null,
    description: null,
  };
}

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
  group_id: null,
};
let tasks: CalendarTask[] = [];
let groups: CalendarGroup[] = [];
let eventRows: CalendarEvent[] = EVENTS;

type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let patchResponse: { status: number; body: unknown } = { status: 200, body: null };
let deleteStatus = 200;
let alertClaim: { due: unknown[]; missed: unknown[] } = { due: [], missed: [] };
let storedAlerts: CalendarAlert[] = [];
let alertWriteStatus = 200;

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
  groups = [];
  eventRows = EVENTS;
  deleteStatus = 200;
  alertClaim = { due: [], missed: [] };
  storedAlerts = [];
  alertWriteStatus = 200;
  patchResponse = { status: 200, body: { success: true, data: EVENTS[0] } };
  localStorage.clear();
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "GET" && url === "/api/events") return json({ success: true, data: eventRows });
    if (method === "GET" && url === "/api/tasks") return json({ success: true, data: tasks });
    if (method === "GET" && url === "/api/groups") return json({ success: true, data: groups });
    if (method === "POST" && url === "/api/groups") {
      const body = JSON.parse(String(init?.body));
      const created: CalendarGroup = { id: "group-new", category_id: body.category_id, name: body.name };
      groups = [...groups, created];
      return json({ success: true, data: created }, 201);
    }
    if (method === "DELETE" && url.startsWith("/api/groups/")) {
      const gone = groups.find((g) => `/api/groups/${g.id}` === url);
      groups = groups.filter((g) => g !== gone);
      return json({ success: true, data: gone, events: [], tasks: [] });
    }
    if (method === "GET" && url === "/api/categories") return json({ success: true, data: [SPACE] });
    if (method === "POST" && url === "/api/alerts/claim") return json({ success: true, data: alertClaim });
    if (url === "/api/alerts" && method === "GET") return json({ success: true, data: storedAlerts });
    if (url === "/api/alerts" && method === "POST") {
      if (alertWriteStatus !== 200) return json({ success: false, error: "alert failed" }, alertWriteStatus);
      const body = JSON.parse(String(init?.body));
      const created: CalendarAlert = {
        id: `alert-${storedAlerts.length + 1}-${body.offset_minutes}`,
        event_id: body.event_id ?? null,
        task_id: body.task_id ?? null,
        offset_minutes: body.offset_minutes,
        fire_at: new Date().toISOString(),
        fired_at: null,
      };
      storedAlerts = [...storedAlerts, created];
      return json({ success: true, data: created }, 201);
    }
    if (url.startsWith("/api/alerts/") && method === "DELETE") {
      storedAlerts = storedAlerts.filter((a) => `/api/alerts/${a.id}` !== url);
      return json({ success: true });
    }
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

// A failed `expect(element).toBeNull()` makes bun print the whole happy-dom
// tree, which hangs the run. Assert on a boolean instead.
const isAbsent = (el: Element | null) => el === null;
const eventDetails = () => document.querySelector("[aria-label='Event details']");
const createPopover = () => document.querySelector("[role='dialog'][aria-label='Create event']");
const titleField = () => eventDetails()!.querySelector<HTMLInputElement>("#event-inspector-title")!;
const panelOpen = () => document.querySelector("[aria-label='Close panel']") !== null;
async function selectSchool() {
  await click(document.querySelector("nav [aria-label='School']")!);
}

async function openSchoolOverview() {
  await selectSchool();
}

async function openGroup(name: string) {
  await selectSchool();
  const chip = [...document.querySelectorAll<HTMLElement>("[role='complementary'] [aria-label='Groups'] button")].find(
    (b) => b.textContent === name
  );
  if (!chip) throw new Error(`no Group chip named ${name}`);
  await click(chip);
}

async function openAllTasks() {
  await click(document.querySelector("nav [aria-label='View all spaces']")!);
}

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
      expect(isAbsent(createPopover())).toBe(true);
      expect(titleField().value).toBe("Lecture");

      await click(document.querySelector("[aria-label='Close event details']")!);
      expect(isAbsent(eventDetails())).toBe(true);
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
        open: () => click(document.querySelector("[aria-label='Open event: Lab']")!),
      },
    ];

    for (const { name, open } of entryPoints) {
      it(`an event opened from ${name} shows its details and no popover`, async () => {
        await mount();
        await open();
        expect(eventDetails()).not.toBeNull();
        expect(isAbsent(createPopover())).toBe(true);
      });
    }

    it("an event's right-click menu opens its details", async () => {
      await mount();
      await rightClick(eventBlock("Lab"));
      await click(buttonByText("Open details")!);
      expect(titleField().value).toBe("Lab");
      expect(isAbsent(createPopover())).toBe(true);
    });

    it("creating an event from the context menu still opens the create popover", async () => {
      await mount();
      await createFromSlotMenu();
      expect(createPopover()).not.toBeNull();
      expect(isAbsent(eventDetails())).toBe(true);
    });

    it("opening an event closes an open create popover", async () => {
      await mount();
      await createFromSlotMenu();
      expect(createPopover()).not.toBeNull();

      await click(eventBlock("Lecture"));
      expect(isAbsent(createPopover())).toBe(true);
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
      expect(isAbsent(eventDetails())).toBe(true);
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
    await openSchoolOverview();
    await click(document.querySelector("[aria-label='Close panel']")!);
    expect(panelOpen()).toBe(false);

    await remount();
    expect(panelOpen()).toBe(false);
  });

  it("after a remount the panel reopens on the Space that was open", async () => {
    await mount();
    await openSchoolOverview();
    expect(panelOpen()).toBe(true);

    await remount();
    expect(panelOpen()).toBe(true);
    expect(JSON.parse(localStorage.getItem("kalend.panel")!)).toEqual({
      active: { kind: "space", spaceId: "space-1" },
    });
  });

  it("All tasks stays open when another date is selected, and is not restored after a remount", async () => {
    testWindow.happyDOM.setInnerWidth(1300);
    await mount();
    await openAllTasks();
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
    await openSchoolOverview();
    expect(panelOpen()).toBe(true);
    expect(panelIsSheet()).toBe(false);

    await act(async () => {
      testWindow.happyDOM.setInnerWidth(1000);
      window.dispatchEvent(new Event("resize"));
    });
    await settle();
    expect(panelIsSheet()).toBe(true);
  });

  describe("breadcrumb and Back", () => {
    const breadcrumb = () => document.querySelector("nav[aria-label='Breadcrumb']");
    const calendarPosition = () => ({
      title: document.querySelector("h1")?.textContent,
      view: [...document.querySelectorAll("[role='tab'][aria-selected='true']")]
        .map((b) => b.textContent)
        .find((t) => /(Week|Month|Day)$/.test(t ?? "")),
    });
    const allTasksPanel = () => document.querySelector("[role='complementary'][aria-label='All tasks']");

    beforeEach(() => {
      tasks = [ESSAY];
      testWindow.happyDOM.setInnerWidth(1300);
    });

    it("names the Space and the item, and the Space opens its overview without moving the calendar", async () => {
      await mount();
      await switchView("Month");
      const before = calendarPosition();
      expect(before.view).toEndWith("Month");
      await click(eventBlock("Lecture"));
      expect(breadcrumb()?.textContent).toBe("School/Lecture");
      expect(isAbsent(document.querySelector("[aria-label^='Back to']"))).toBe(true);

      await click([...breadcrumb()!.querySelectorAll("button")].find((b) => b.textContent === "School")!);
      expect(isAbsent(eventDetails())).toBe(true);
      expect(JSON.parse(localStorage.getItem("kalend.panel")!)).toEqual({
        active: { kind: "space", spaceId: "space-1" },
      });
      expect(calendarPosition()).toEqual(before);
    });

    it("Back from a task opened in All tasks returns to All tasks", async () => {
      await mount();
      await openAllTasks();
      await click(allTasksPanel()!.querySelector("[aria-label='Edit task Essay draft']")!);
      await click(allTasksPanel()!.querySelector("[aria-label='Open task Essay draft']")!);
      expect(isAbsent(allTasksPanel())).toBe(true);

      await click(document.querySelector("[aria-label='Back to All tasks']")!);
      expect(allTasksPanel()).not.toBeNull();
    });

    it("Back from an event opened over a Space overview returns to that overview", async () => {
      await mount();
      await openSchoolOverview();
      await click(eventBlock("Lecture"));
      expect(eventDetails()).not.toBeNull();

      await click(document.querySelector("[aria-label='Back to School']")!);
      expect(isAbsent(eventDetails())).toBe(true);
      expect(panelOpen()).toBe(true);
      expect(JSON.parse(localStorage.getItem("kalend.panel")!).active?.kind).toBe("space");
    });

    it("Back waits for the unsaved-edits answer", async () => {
      await mount();
      await openAllTasks();
      await click(allTasksPanel()!.querySelector("[aria-label='Edit task Essay draft']")!);
      await click(allTasksPanel()!.querySelector("[aria-label='Open task Essay draft']")!);
      const input = document.querySelector("[aria-label='Task details'] input") as HTMLInputElement;
      await act(async () => typeInto(input, "Essay v2"));

      await click(document.querySelector("[aria-label='Back to All tasks']")!);
      expect(isAbsent(allTasksPanel())).toBe(true);
      expect(document.querySelector("[role='alertdialog']")).not.toBeNull();

      await click(buttonByText("Discard")!);
      expect(allTasksPanel()).not.toBeNull();
    });
  });

  describe("Groups", () => {
    const BIO: CalendarGroup = { id: "group-bio", category_id: SPACE.id, name: "BIO 102" };
    const panelHeading = () => document.querySelector("[role='complementary'] h2")?.getAttribute("aria-label");

    beforeEach(() => {
      groups = [BIO];
      eventRows = [{ ...EVENTS[0], group_id: BIO.id }, EVENTS[1], RETREAT];
      tasks = [{ ...ESSAY, group_id: BIO.id }, { ...ESSAY, id: "t2", title: "Direct task" }];
      testWindow.happyDOM.setInnerWidth(1300);
    });

    it("opens a Group from the selected Space with only its own tasks", async () => {
      await mount();
      await openGroup("BIO 102");
      expect(panelHeading()).toBe("BIO 102");
      const panelTasks = [...document.querySelectorAll("[role='complementary'] [aria-label^='Edit task ']")].map(
        (b) => b.getAttribute("aria-label")
      );
      expect(panelTasks).toEqual(["Edit task Essay draft"]);
    });

    it("the Space overview lists its Group's tasks and its direct tasks once each", async () => {
      await mount();
      await openSchoolOverview();
      const panelTasks = [...document.querySelectorAll("[role='complementary'] [aria-label^='Edit task ']")].map(
        (b) => b.getAttribute("aria-label")
      );
      expect(panelTasks.sort()).toEqual(["Edit task Direct task", "Edit task Essay draft"]);
    });

    it("remembers an open Group after a remount", async () => {
      await mount();
      await openGroup("BIO 102");
      await remount();
      expect(panelHeading()).toBe("BIO 102");
      expect(JSON.parse(localStorage.getItem("kalend.panel")!).active).toEqual({
        kind: "group",
        groupId: "group-bio",
        spaceId: "space-1",
      });
    });

    it("creating an event from a Group's panel starts in that Group, and the choice can change", async () => {
      await mount();
      await openGroup("BIO 102");
      await click(document.querySelector<HTMLElement>("[role='complementary'] [aria-label='Add event']")!);
      const trigger = () => createPopover()?.querySelector("[aria-label^='Space: ']")?.getAttribute("aria-label");
      expect(trigger()).toBe("Space: School / BIO 102");

      await click(createPopover()!.querySelector("[aria-label^='Space: ']")!);
      await click(buttonByText("No Space")!);
      expect(trigger()).toBe("Space: No Space");
    });

    it("adding a task from a Group's panel creates it in that Group", async () => {
      await mount();
      await openGroup("BIO 102");
      await click(document.querySelector<HTMLElement>("[role='complementary'] [aria-label='Add task']")!);
      const input = document.querySelector<HTMLInputElement>("[aria-label='New task title']")!;
      await act(async () => typeInto(input, "Read chapter 4"));
      await act(async () => {
        document.querySelector("[role='complementary'] form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      await settle();
      const post = calls.find((c) => c.method === "POST" && c.url === "/api/tasks");
      expect(post?.body).toMatchObject({ title: "Read chapter 4", category_id: "space-1", group_id: "group-bio" });
    });

    it("the breadcrumb names the Space, the Group and the item", async () => {
      await mount();
      await click(eventBlock("Lecture"));
      expect(document.querySelector("nav[aria-label='Breadcrumb']")?.textContent).toBe("School/BIO 102/Lecture");
    });

    it("creates a Group from the empty list prompt", async () => {
      groups = [];
      await mount();
      await selectSchool();
      await click(document.querySelector("[role='complementary'] [aria-label='New Group']")!);
      const input = document.querySelector<HTMLInputElement>("[aria-label='Group name']")!;
      await act(async () => typeInto(input, "HIST 201"));
      await click(buttonByText("Create")!);

      const post = calls.find((c) => c.method === "POST" && c.url === "/api/groups");
      expect(post?.body).toEqual({ category_id: "space-1", name: "HIST 201" });
      expect([...document.querySelectorAll("button")].some((b) => b.textContent === "HIST 201")).toBe(true);
    });

    it("deleting a Group says what happens, then removes it and closes its panel", async () => {
      await mount();
      await openGroup("BIO 102");
      await click(document.querySelector("[aria-label='Group settings']")!);
      await click(document.querySelector("[aria-label='Delete Group']")!);
      const message = document.querySelector("[role='dialog']")?.textContent ?? "";
      expect(message).toContain("Its 1 event and 1 task stay in School");

      await click(document.querySelector("[aria-label='Confirm delete Group']")!);
      expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/groups/group-bio")).toBe(true);
      expect([...document.querySelectorAll("button")].some((b) => b.textContent === "BIO 102")).toBe(false);
      expect(panelOpen()).toBe(false);
    });
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

      await openAllTasks();
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
      await openAllTasks();

      expect(document.querySelector("[role='alertdialog']")).not.toBeNull();
      expect((buttonByText("Delete") as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe("reminders", () => {
    const dueLecture = {
      id: "a1",
      kind: "event",
      item_id: "e1",
      title: "Lecture",
      offset_minutes: 15,
      fire_at: new Date().toISOString(),
    };
    const reminders = () => document.querySelector("[aria-label='Reminders']")!;

    it("shows a due reminder and opens its event when clicked", async () => {
      alertClaim = { due: [dueLecture], missed: [] };
      await mount();
      expect(reminders().textContent).toContain("Lecture starts in 15 min");
      expect(isAbsent(eventDetails())).toBe(true);

      await click(buttonByText("Lecture starts in 15 min")!);
      expect(isAbsent(eventDetails())).toBe(false);
      expect(titleField().value).toBe("Lecture");
      expect(reminders().textContent).not.toContain("Lecture starts in 15 min");
    });

    it("opens the task for a task reminder", async () => {
      tasks = [ESSAY];
      alertClaim = {
        due: [{ ...dueLecture, id: "a2", kind: "task", item_id: ESSAY.id, title: ESSAY.title, offset_minutes: 0 }],
        missed: [],
      };
      await mount();
      await click(buttonByText("Essay draft is due now")!);
      expect(document.querySelector("[aria-label='Task details']") !== null).toBe(true);
    });

    const taskReminder = (itemId: string, title: string) => ({
      ...dueLecture,
      id: "a9",
      kind: "task",
      item_id: itemId,
      title,
      offset_minutes: 0,
    });

    it("refetches and opens an item this tab has not loaded yet", async () => {
      alertClaim = { due: [taskReminder(ESSAY.id, ESSAY.title)], missed: [] };
      await mount(); // the task does not exist yet, as if another tab created it
      tasks = [ESSAY];
      const taskFetches = () => calls.filter((c) => c.method === "GET" && c.url === "/api/tasks").length;
      const before = taskFetches();

      await click(buttonByText("Essay draft is due now")!);
      expect(taskFetches()).toBe(before + 1);
      expect(document.querySelector("[aria-label='Task details']") !== null).toBe(true);
    });

    it("says the item no longer exists when the refetch still lacks it", async () => {
      alertClaim = { due: [taskReminder("deleted-task", "Ghost task")], missed: [] };
      await mount();

      await click(buttonByText("Ghost task is due now")!);
      expect(reminders().textContent).toContain("That task no longer exists.");
      expect(document.querySelector("[aria-label='Task details']") === null).toBe(true);
    });

    it("lists reminders missed while closed, once, and lets them be dismissed", async () => {
      alertClaim = { due: [], missed: [{ ...dueLecture, id: "a3" }] };
      await mount();
      expect(reminders().textContent).toContain("Missed while you were away");
      await click(buttonByText("Dismiss all")!);
      expect(reminders().textContent).toBe("");
    });
  });

  describe("alerts", () => {
    beforeEach(() => testWindow.happyDOM.setInnerWidth(1300));

    const lectureAlert = (offset: 5 | 15 | 60 = 15): CalendarAlert => ({
      id: "a-lecture",
      event_id: "e1",
      task_id: null,
      offset_minutes: offset,
      fire_at: new Date().toISOString(),
      fired_at: null,
    });
    const alertSelect = (kind: "event" | "task") =>
      document.querySelector<HTMLSelectElement>(`#${kind}-inspector-alert`)!;
    const alertCalls = () =>
      calls
        .filter((c) => c.url.startsWith("/api/alerts") && !c.url.endsWith("/claim") && c.method !== "GET")
        .map((c) => `${c.method} ${c.url}${c.body ? ` ${JSON.stringify(c.body)}` : ""}`);
    // The row a bell belongs to: the nearest ancestor holding an Open button.
    const bellRows = () =>
      [...document.querySelectorAll("[aria-label='Alert set']")].map((bell) => {
        let row = bell.parentElement;
        while (row && !row.querySelector("button[aria-label^='Open']")) row = row.parentElement;
        return row?.querySelector("button[aria-label^='Open']")?.getAttribute("aria-label");
      });
    const save = () => click(buttonByText("Save")!);

    class FakeNotification {
      static permission: NotificationPermission = "default";
      static asked = 0;
      static answer: NotificationPermission = "denied";
      static async requestPermission() {
        FakeNotification.asked++;
        FakeNotification.permission = FakeNotification.answer;
        return FakeNotification.answer;
      }
    }
    const originalNotification = (globalThis as Record<string, unknown>).Notification;
    beforeEach(() => {
      FakeNotification.permission = "default";
      FakeNotification.asked = 0;
      FakeNotification.answer = "denied";
      (globalThis as Record<string, unknown>).Notification = FakeNotification;
    });
    afterEach(() => {
      (globalThis as Record<string, unknown>).Notification = originalNotification;
    });

    it("shows a bell in the day panel only for items that have an alert", async () => {
      storedAlerts = [lectureAlert()];
      await mount();
      expect(new Set(bellRows())).toEqual(new Set(["Open event: Lecture"]));
    });

    it("sets an alert after the event saves, then shows the bell and keeps it after a reload", async () => {
      await mount();
      await click(eventBlock("Lecture"));
      expect(alertSelect("event").value).toBe("");

      await act(async () => chooseOption(alertSelect("event"), "15"));
      await save();

      expect(alertCalls()).toEqual(['POST /api/alerts {"event_id":"e1","offset_minutes":15}']);
      expect(calls.some((c) => c.method === "PATCH")).toBe(false);
      expect(alertSelect("event").value).toBe("15");
      expect(new Set(bellRows())).toEqual(new Set(["Open event: Lecture"]));

      await remount();
      expect(new Set(bellRows())).toEqual(new Set(["Open event: Lecture"]));
      await click(eventBlock("Lecture"));
      expect(alertSelect("event").value).toBe("15");
    });

    it("saves the event first and the alert second when both changed", async () => {
      patchResponse = { status: 200, body: { success: true, data: { ...EVENTS[0], title: "Lecture 2" } } };
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => typeInto(titleField(), "Lecture 2"));
      await act(async () => chooseOption(alertSelect("event"), "60"));
      await save();

      const writes = calls.filter((c) => c.method !== "GET" && !c.url.endsWith("/claim")).map((c) => `${c.method} ${c.url}`);
      expect(writes).toEqual(["PATCH /api/events/e1", "POST /api/alerts"]);
    });

    it("changes an alert by creating the new one before deleting the old one", async () => {
      storedAlerts = [lectureAlert(15)];
      await mount();
      await click(eventBlock("Lecture"));
      expect(alertSelect("event").value).toBe("15");

      await act(async () => chooseOption(alertSelect("event"), "5"));
      await save();
      expect(alertCalls()).toEqual(['POST /api/alerts {"event_id":"e1","offset_minutes":5}', "DELETE /api/alerts/a-lecture"]);
      expect(alertSelect("event").value).toBe("5");
    });

    it("clears an alert and removes the bell", async () => {
      storedAlerts = [lectureAlert(15)];
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => chooseOption(alertSelect("event"), ""));
      await save();

      expect(alertCalls()).toEqual(["DELETE /api/alerts/a-lecture"]);
      expect(bellRows()).toEqual([]);
    });

    it("keeps the draft and offers a retry when the alert fails after the event saved", async () => {
      alertWriteStatus = 500;
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => chooseOption(alertSelect("event"), "15"));
      await save();

      expect(eventDetails()!.querySelector("[role='alert']")?.textContent).toContain("Couldn't save");
      expect(alertSelect("event").value).toBe("15");
      expect(bellRows()).toEqual([]);

      alertWriteStatus = 200;
      await click(buttonByText("Retry")!);
      expect(new Set(bellRows())).toEqual(new Set(["Open event: Lecture"]));
    });

    it("sets and clears a task's alert from the task details", async () => {
      tasks = [ESSAY];
      await mount();
      await click(document.querySelector("button[aria-label='Open task Essay draft']")!);
      await act(async () => chooseOption(alertSelect("task"), "0"));
      await save();
      expect(alertCalls()).toEqual(['POST /api/alerts {"task_id":"t1","offset_minutes":0}']);
      expect(calls.some((c) => c.method === "PATCH")).toBe(false);
      expect(new Set(bellRows())).toEqual(new Set(["Open task Essay draft"]));

      await act(async () => chooseOption(alertSelect("task"), ""));
      await save();
      expect(bellRows()).toEqual([]);
    });

    it("asks for notification permission once, on the first saved alert, and explains a refusal", async () => {
      await mount();
      expect(FakeNotification.asked).toBe(0);
      await click(eventBlock("Lecture"));
      expect(FakeNotification.asked).toBe(0);

      await act(async () => chooseOption(alertSelect("event"), "15"));
      await save();
      expect(FakeNotification.asked).toBe(1);
      expect(document.querySelector("[aria-label='Reminders']")!.textContent).toContain("only inside Kalend");

      await act(async () => chooseOption(alertSelect("event"), "5"));
      await save();
      expect(FakeNotification.asked).toBe(1);
    });

    it("says nothing when the user allows notifications", async () => {
      FakeNotification.answer = "granted";
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => chooseOption(alertSelect("event"), "15"));
      await save();
      expect(FakeNotification.asked).toBe(1);
      expect(document.querySelector("[aria-label='Reminders']")!.textContent).toBe("");
    });

    it("does not ask when permission was already answered", async () => {
      FakeNotification.permission = "denied";
      storedAlerts = [lectureAlert(15)];
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => chooseOption(alertSelect("event"), "5"));
      await save();
      expect(FakeNotification.asked).toBe(0);
      expect(document.querySelector("[aria-label='Reminders']")!.textContent).toBe("");
    });

    it("explains in-app-only alerts right away in a browser with no notifications", async () => {
      delete (globalThis as Record<string, unknown>).Notification;
      await mount();
      await click(eventBlock("Lecture"));
      await act(async () => chooseOption(alertSelect("event"), "15"));
      await save();
      expect(document.querySelector("[aria-label='Reminders']")!.textContent).toContain("only inside Kalend");
    });
  });
});
