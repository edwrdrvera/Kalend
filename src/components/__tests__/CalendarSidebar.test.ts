import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarTask,
} from "@/lib/calendar-types";
import { typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: CalendarSidebar } = await import("../CalendarSidebar");
const { ThemeProvider } = await import("@/lib/theme");
const { AppRouterContext } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("next/dist/shared/lib/app-router-context.shared-runtime") as {
    AppRouterContext: React.Context<import("next/dist/shared/lib/app-router-context.shared-runtime").AppRouterInstance | null>;
  };

/** Minimal mock satisfying SettingsMenu's useRouter() call. */
const mockRouter = {
  back: () => {},
  forward: () => {},
  push: () => {},
  replace: () => {},
  refresh: () => {},
  prefetch: () => Promise.resolve(),
} as unknown as import("next/dist/shared/lib/app-router-context.shared-runtime").AppRouterInstance;

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
  categoriesLoading?: boolean;
  selectedSpaceId?: string | null;
  hiddenCategoryIds?: string[];
  onCreateTask?: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
}

interface Interactions {
  createdTasks: Array<{ title: string; dueAt?: string; categoryId?: string | null }>;
  eventClicks: string[];
  taskToggles: string[];
  taskDeletes: string[];
  selectedSpaces: (string | null)[];
}

async function renderSidebar(options: RenderOptions = {}) {
  const interactions: Interactions = {
    createdTasks: [],
    eventClicks: [],
    taskToggles: [],
    taskDeletes: [],
    selectedSpaces: [],
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const onCreateTask =
    options.onCreateTask ??
    (async (title: string, dueAt?: string, categoryId?: string | null) => {
      interactions.createdTasks.push({ title, dueAt, categoryId });
    });

  await act(() =>
    root?.render(
      createElement(
        AppRouterContext.Provider,
        { value: mockRouter },
        createElement(
          ThemeProvider,
          null,
          createElement(CalendarSidebar, {
          currentDate: today,
          viewDate: today,
          onDateSelect: () => {},
          tasks: options.tasks ?? [],
          events: options.events ?? [],
          tasksLoading: options.tasksLoading ?? false,
          eventsLoading: options.eventsLoading ?? false,
          onCreateTask,
          onToggleTaskComplete: (task) => interactions.taskToggles.push(task.id),
          onDeleteTask: (task) => interactions.taskDeletes.push(task.id),
          onEventClick: (event) => interactions.eventClicks.push(event.id),
          categories: options.categories ?? [],
          categoriesLoading: options.categoriesLoading ?? false,
          selectedSpaceId: options.selectedSpaceId ?? null,
          onSelectSpace: (id) => interactions.selectedSpaces.push(id),
          hiddenCategoryIds: options.hiddenCategoryIds ?? [],
          onToggleCategoryVisibility: () => {},
          onCreateCategory: async () => {},
          onUpdateCategory: () => {},
          onDeleteCategory: async () => {},
        })
        )
      )
    )
  );
  return interactions;
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

function allByLabel(label: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`)];
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("CalendarSidebar empty state", () => {
  it("shows a friendly empty-state message when there are no spaces", async () => {
    await renderSidebar({ categories: [], events: [], tasks: [] });

    const text = document.body.textContent ?? "";
    // The sidebar should guide the user to create their first space.
    expect(text).toMatch(/no spaces yet/i);
  });

  it("shows a calm placeholder when nothing is scheduled for today", async () => {
    await renderSidebar({ categories: [], events: [], tasks: [] });

    const text = document.body.textContent ?? "";
    expect(text).toMatch(/nothing scheduled/i);
  });

  it("renders the inline task composer input", async () => {
    await renderSidebar({ categories: [], events: [], tasks: [] });

    // The task composer should be present as a clickable/focusable element
    // in the sidebar DOM (not inside a popover).
    const composer = byLabel("Add a task") ?? byLabel("New task title");
    expect(composer).not.toBeNull();
  });
});

describe("CalendarSidebar categories render", () => {
  it("renders all category names when given 5 categories", async () => {
    await renderSidebar({ categories: fiveCategories });

    const text = document.body.textContent ?? "";
    for (const cat of fiveCategories) {
      expect(text).toContain(cat.name);
    }
  });
});

describe("CalendarSidebar agenda inline", () => {
  it("renders agenda items directly in the sidebar, not behind a popover", async () => {
    await renderSidebar({
      categories: [makeCategory()],
      events: [makeEvent()],
      tasks: [makeTask()],
    });

    // The event title and task title should be directly visible in the sidebar
    // without opening any popover.
    const text = document.body.textContent ?? "";
    expect(text).toContain("Biology lecture");
    expect(text).toContain("Finish lab report");
  });
});

describe("CalendarSidebar independent scroll", () => {
  it("has an independently scrollable agenda zone", async () => {
    await renderSidebar({
      events: [makeEvent()],
      tasks: [makeTask()],
    });

    // Find the agenda panel container. It should have overflow-y: auto
    // so it scrolls independently from the spaces rail and bottom zone.
    const agendaPanel = document.querySelector('[data-testid="agenda-panel"]');
    expect(agendaPanel).not.toBeNull();
    expect(agendaPanel?.className).toContain("overflow-y-auto");
  });
});

describe("CalendarSidebar inline task composer", () => {
  it("has the task composer inline in the sidebar DOM (not in a popover)", async () => {
    await renderSidebar({ categories: [makeCategory()] });

    // The composer trigger/input should be present directly in the sidebar.
    const addTaskTrigger = byLabel("Add a task");
    expect(addTaskTrigger).not.toBeNull();

    // It should be inside the sidebar aside element, not in a popover portal.
    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.contains(addTaskTrigger)).toBe(true);
  });

  it("calls onCreateTask when a title is typed and submitted", async () => {
    const interactions = await renderSidebar({ categories: [makeCategory()] });

    // Click the "Add a task" trigger to expand the composer.
    const trigger = byLabel("Add a task");
    await act(() => trigger?.click());

    // Type a task title into the expanded form.
    const input = byLabel("New task title") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    await act(() => typeInto(input!, "Study for midterm"));

    // Submit the form.
    const submitBtn = byLabel("Add task");
    expect(submitBtn).not.toBeNull();
    await act(async () => submitBtn?.click());

    expect(interactions.createdTasks.length).toBeGreaterThanOrEqual(1);
    expect(interactions.createdTasks[0]?.title).toBe("Study for midterm");
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
