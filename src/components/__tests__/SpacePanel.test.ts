import "./test-dom";
import { typeInto } from "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarTask } from "@/lib/calendar-types";
import { FIXTURE_BRANCH_FULL, FIXTURE_BRANCH_SPARSE } from "@/lib/branch-fixtures";
import type { Branch } from "@/lib/branch-types";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: SpacePanel } = await import("../SpacePanel");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

interface Handlers {
  closes: number;
  created: string[];
}

async function render(branch: Branch, tasks: CalendarTask[] = []) {
  const handlers: Handlers = { closes: 0, created: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(SpacePanel, {
        branch,
        tasks,
        modal: false,
        onClose: () => {
          handlers.closes++;
        },
        onToggleComplete: () => {},
        onCreateTask: async (title: string) => {
          handlers.created.push(title);
        },
        onOpenSettings: () => {},
      })
    )
  );
  return handlers;
}

describe("SpacePanel", () => {
  it("shows the Space label and branch heading, plus data-backed sections", async () => {
    await render(FIXTURE_BRANCH_FULL);
    const text = container?.textContent ?? "";
    expect(text).toContain("School");
    expect(text).toContain("CS 340");
    expect(text).toContain("Meets");
    expect(text).toContain("People");
    expect(text).toContain("Links");
  });

  it("omits Meets/People/Links when the branch has none", async () => {
    await render(FIXTURE_BRANCH_SPARSE);
    const text = container?.textContent ?? "";
    expect(text).not.toContain("Meets");
    expect(text).not.toContain("People");
    expect(text).not.toContain("Links");
    // Open tasks label always renders (it hosts the "+ Add" affordance).
    expect(text).toContain("Open tasks");
  });

  it("closes on Escape when focus is inside the panel", async () => {
    const handlers = await render(FIXTURE_BRANCH_FULL);
    const panel = container?.querySelector<HTMLElement>('[role="complementary"]');
    await act(() => {
      panel?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(handlers.closes).toBe(1);
  });

  it("reveals a composer from + Add and creates a task in the branch", async () => {
    const handlers = await render(FIXTURE_BRANCH_FULL);
    const add = document.querySelector<HTMLButtonElement>('[aria-label="Add task"]');
    await act(() => add?.click());

    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="New task title"]'
    );
    expect(input).not.toBeNull();
    if (input) await act(() => typeInto(input, "Read chapter 4"));
    const form = document.querySelector<HTMLFormElement>("form");
    await act(() => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(handlers.created).toEqual(["Read chapter 4"]);
  });
});
