import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createElement, act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import { testWindow } from "./test-dom";

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

const EVENTS = [makeEvent("e1", "Lecture", 9), makeEvent("e2", "Lab", 13)];

type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let patchResponse: { status: number; body: unknown } = { status: 200, body: null };

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
  patchResponse = { status: 200, body: { success: true, data: EVENTS[0] } };
  localStorage.clear();
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "GET" && url === "/api/events") return json({ success: true, data: EVENTS });
    if (method === "GET" && url === "/api/tasks") return json({ success: true, data: [] });
    if (method === "GET" && url === "/api/categories") return json({ success: true, data: [SPACE] });
    if (method === "PATCH") return json(patchResponse.body, patchResponse.status);
    if (method === "DELETE") return json({ success: true });
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

const editor = () => document.querySelector("[aria-label='Edit event']");
const panelOpen = () => document.querySelector("[aria-label='Close panel']") !== null;
// Below 1200px the panel is a modal sheet behind a full-screen scrim button.
const panelIsSheet = () => document.querySelector("button.inset-0[aria-label='Close panel']") !== null;

describe("Calendar behavior", () => {
  it("clicking an event opens its editor, and Cancel closes it", async () => {
    await mount();
    await click(eventBlock("Lecture"));
    expect(editor()).not.toBeNull();

    await click(buttonByText("Cancel")!);
    expect(editor()).toBeNull();
  });

  it("a failed save keeps the editor open with the server's error", async () => {
    patchResponse = { status: 400, body: { success: false, error: "Title is required" } };
    await mount();
    await click(eventBlock("Lecture"));
    const form = editor()!.querySelector("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await settle();

    expect(calls.some((c) => c.method === "PATCH" && c.url === "/api/events/e1")).toBe(true);
    expect(editor()).not.toBeNull();
    expect(editor()!.textContent).toContain("Title is required");
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

  it("the editor breadcrumb opens the Space panel and closes the editor", async () => {
    await mount();
    await click(eventBlock("Lecture"));
    await click(editor()!.querySelector("form button")!);

    expect(editor()).toBeNull();
    expect(panelOpen()).toBe(true);
    expect(JSON.parse(localStorage.getItem("kalend.branchPanel")!)).toEqual({
      active: { branchId: "space-1:default", spaceId: "space-1" },
      lastBranchBySpace: { "space-1": "space-1:default" },
    });
  });

  it("a panel closed before a remount stays closed", async () => {
    await mount();
    await click(eventBlock("Lecture"));
    await click(editor()!.querySelector("form button")!);
    await click(document.querySelector("[aria-label='Close panel']")!);
    expect(panelOpen()).toBe(false);

    await remount();
    expect(panelOpen()).toBe(false);
  });

  it("after a remount the panel reopens on the branch that was open", async () => {
    await mount();
    await click(eventBlock("Lecture"));
    await click(editor()!.querySelector("form button")!);
    expect(panelOpen()).toBe(true);

    await remount();
    expect(panelOpen()).toBe(true);
    expect(JSON.parse(localStorage.getItem("kalend.branchPanel")!)).toEqual({
      active: { branchId: "space-1:default", spaceId: "space-1" },
      lastBranchBySpace: { "space-1": "space-1:default" },
    });
  });

  it("the panel is pinned on wide windows and a sheet on narrow ones", async () => {
    testWindow.happyDOM.setInnerWidth(1300);
    await mount();
    await click(eventBlock("Lecture"));
    await click(editor()!.querySelector("form button")!);
    expect(panelOpen()).toBe(true);
    expect(panelIsSheet()).toBe(false);

    await act(async () => {
      testWindow.happyDOM.setInnerWidth(1000);
      window.dispatchEvent(new Event("resize"));
    });
    await settle();
    expect(panelIsSheet()).toBe(true);
  });
});
