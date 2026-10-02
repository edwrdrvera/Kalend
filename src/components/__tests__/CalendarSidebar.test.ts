import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarTask,
} from "@/lib/calendar-types";
import { branchesForSpaces } from "@/lib/branch-stub";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: CalendarSidebar } = await import("../CalendarSidebar");

// ── Fixtures ──────────────────────────────────────────────────────────────

const today = new Date(2030, 8, 9, 12);

function makeCategory(overrides: Partial<CalendarCategory> = {}): CalendarCategory {
  return {
    id: "cat-1",
    name: "Work",
    color: "green",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Biology lecture",
    start_at: new Date(2030, 8, 9, 9).toISOString(),
    end_at: new Date(2030, 8, 9, 10).toISOString(),
    color: "blue",
    color_overridden: true,
    category_id: null,
    location: null,
    icon: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<CalendarTask> = {}): CalendarTask {
  return {
    id: "task-1",
    title: "Finish lab report",
    due_at: new Date(2030, 8, 9, 23, 59).toISOString(),
    completed: false,
    color: "blue",
    color_overridden: true,
    category_id: null,
    ...overrides,
  };
}

const fiveCategories: CalendarCategory[] = [
  makeCategory({ id: "cat-1", name: "Work", color: "green" }),
  makeCategory({ id: "cat-2", name: "Personal", color: "purple" }),
  makeCategory({ id: "cat-3", name: "School", color: "blue" }),
  makeCategory({ id: "cat-4", name: "Fitness", color: "red" }),
  makeCategory({ id: "cat-5", name: "Side Project", color: "yellow" }),
];

// ── Render harness ────────────────────────────────────────────────────────

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

interface RenderOptions {
  categories?: CalendarCategory[];
  events?: CalendarEvent[];
  tasks?: CalendarTask[];
  tasksLoading?: boolean;
  eventsLoading?: boolean;
  selectedSpaceId?: string | null;
}

interface Interactions {
  eventClicks: string[];
  taskToggles: string[];
  selectedSpaces: (string | null)[];
  openedBranches: string[];
  allTasksOpens: number;
}

async function renderSidebar(options: RenderOptions = {}) {
  const interactions: Interactions = {
    eventClicks: [],
    taskToggles: [],
    selectedSpaces: [],
    openedBranches: [],
    allTasksOpens: 0,
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(CalendarSidebar, {
        currentDate: today,
        viewDate: today,
        onDateSelect: () => {},
        tasks: options.tasks ?? [],
        events: options.events ?? [],
        tasksLoading: options.tasksLoading ?? false,
        eventsLoading: options.eventsLoading ?? false,
        alertsByItem: new Map(),
        onToggleTaskComplete: (task) => interactions.taskToggles.push(task.id),
        onOpenTask: () => {},
        onOpenAllTasks: () => interactions.allTasksOpens++,
        onEventClick: (event) => interactions.eventClicks.push(event.id),
        categories: options.categories ?? [],
        selectedSpaceId: options.selectedSpaceId ?? null,
        onSelectSpace: (id) => interactions.selectedSpaces.push(id),
        onCreateSpace: () => {},
        onEditSpace: () => {},
        branches: branchesForSpaces(options.categories ?? []),
        activeBranchId: null,
        onOpenBranch: (branch) => interactions.openedBranches.push(branch.id),
      })
    )
  );
  return interactions;
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("CalendarSidebar layout", () => {
  it("renders the IconRail with its navigation landmark", async () => {
    await renderSidebar({ categories: fiveCategories });

    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    expect(nav).not.toBeNull();
  });

  it("renders the AgendaColumn", async () => {
    await renderSidebar();

    const column = document.querySelector('[data-testid="agenda-column"]');
    expect(column).not.toBeNull();
  });

  it("renders the MiniCalendar with month navigation", async () => {
    await renderSidebar();

    const prevBtn = byLabel("Previous month");
    const nextBtn = byLabel("Next month");
    expect(prevBtn).not.toBeNull();
    expect(nextBtn).not.toBeNull();
  });
});

describe("CalendarSidebar collapse", () => {
  it("clicking the logo (collapse toggle) hides the desktop AgendaColumn", async () => {
    await renderSidebar({ categories: fiveCategories });

    // Both the desktop column and the mobile slide-out render an
    // AgendaColumn, so collapsing the desktop one drops the count by one
    // (the mobile slide-out's copy is unaffected).
    const before = document.querySelectorAll('[data-testid="agenda-column"]');
    expect(before.length).toBe(2);

    const toggle = byLabel("Collapse sidebar");
    expect(toggle).not.toBeNull();
    await act(() => toggle?.click());

    const after = document.querySelectorAll('[data-testid="agenda-column"]');
    expect(after.length).toBe(1);
  });

  it("stays collapsed after a reload", async () => {
    await renderSidebar();
    await act(() => byLabel("Collapse sidebar")?.click());
    await act(() => root?.unmount());
    root = null;
    document.body.replaceChildren();

    await renderSidebar();

    expect(byLabel("Expand sidebar")).not.toBeNull();
    expect(document.querySelectorAll('[data-testid="agenda-column"]').length).toBe(1);
  });

  it("opens expanded when stored storage is unreadable", async () => {
    const originalGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = () => {
      throw new Error("storage blocked");
    };
    try {
      await renderSidebar();
    } finally {
      localStorage.getItem = originalGetItem;
    }
    expect(byLabel("Collapse sidebar")).not.toBeNull();
  });

  it("opening a Branch does not collapse the agenda", async () => {
    const work = makeCategory({ id: "cat-1", name: "Work" });
    const interactions = await renderSidebar({ categories: [work], selectedSpaceId: "cat-1" });

    const branchButton = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === null && b.textContent?.trim() === "Work"
    );
    expect(branchButton).toBeDefined();
    await act(() => branchButton?.click());

    expect(interactions.openedBranches).toEqual(["cat-1:default"]);
    expect(document.querySelectorAll('[data-testid="agenda-column"]').length).toBe(2);
  });
});

describe("CalendarSidebar empty state", () => {
  it("shows the create-space button when there are no spaces", async () => {
    await renderSidebar({ categories: [] });

    const createBtn = byLabel("Create space");
    expect(createBtn).not.toBeNull();
  });

  it("shows a calm placeholder when nothing is scheduled for today", async () => {
    await renderSidebar({ categories: [], events: [], tasks: [] });

    const text = document.body.textContent ?? "";
    expect(text).toMatch(/nothing scheduled/i);
  });
});

describe("CalendarSidebar categories", () => {
  it("renders all categories as tiles in the icon rail", async () => {
    await renderSidebar({ categories: fiveCategories });

    for (const cat of fiveCategories) {
      const tile = byLabel(cat.name);
      expect(tile).not.toBeNull();
    }
  });
});

describe("CalendarSidebar space selection", () => {
  it("calls onSelectSpace when a Space tile in the rail is clicked", async () => {
    const interactions = await renderSidebar({
      categories: [makeCategory({ id: "cat-1", name: "Work" })],
    });

    const tile = byLabel("Work");
    expect(tile).not.toBeNull();
    await act(() => tile?.click());

    expect(interactions.selectedSpaces).toContain("cat-1");
  });
});

describe("CalendarSidebar agenda inline", () => {
  it("renders agenda items directly in the sidebar, not behind a popover", async () => {
    await renderSidebar({
      categories: [makeCategory()],
      events: [makeEvent()],
      tasks: [makeTask()],
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Biology lecture");
    expect(text).toContain("Finish lab report");
  });
});

describe("CalendarSidebar All tasks control", () => {
  it("opens the All tasks view from the desktop agenda", async () => {
    const interactions = await renderSidebar();

    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "All tasks"
    );
    expect(button).toBeDefined();
    await act(() => button?.click());

    expect(interactions.allTasksOpens).toBe(1);
  });
});

describe("CalendarSidebar accessibility", () => {
  it("gives all interactive buttons a non-empty accessible name", async () => {
    await renderSidebar({
      categories: fiveCategories,
      events: [makeEvent()],
      tasks: [makeTask()],
    });

    const buttons = document.querySelectorAll<HTMLButtonElement>("button");
    for (const button of buttons) {
      const ariaLabel = button.getAttribute("aria-label") ?? "";
      const textContent = (button.textContent ?? "").trim();
      const hasAccessibleName = ariaLabel.length > 0 || textContent.length > 0;
      expect(hasAccessibleName).toBe(true);
    }
  });
});

describe("CalendarSidebar mobile", () => {
  it("has a hamburger button that opens the mobile sidebar overlay", async () => {
    await renderSidebar();

    const hamburger = byLabel("Open sidebar");
    expect(hamburger).not.toBeNull();

    // Before clicking, the mobile aside should be translated off-screen.
    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain("-translate-x-full");

    // After clicking, the sidebar should slide in.
    await act(() => hamburger?.click());
    const asideAfter = document.querySelector("aside");
    expect(asideAfter?.className).toContain("translate-x-0");
    expect(asideAfter?.className).not.toContain("-translate-x-full");
  });
});
