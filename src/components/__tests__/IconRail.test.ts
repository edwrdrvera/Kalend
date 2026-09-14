import "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory } from "@/lib/calendar-types";
import { spaceAbbreviation } from "@/lib/space-abbreviation";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: IconRail } = await import("../IconRail");

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeCategory(overrides: Partial<CalendarCategory> = {}): CalendarCategory {
  return {
    id: "cat-1",
    name: "Work",
    color: "green",
    ...overrides,
  };
}

const threeCategories: CalendarCategory[] = [
  makeCategory({ id: "cat-1", name: "School", color: "blue" }),
  makeCategory({ id: "cat-2", name: "Work", color: "green" }),
  makeCategory({ id: "cat-3", name: "Fitness", color: "red" }),
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
});

interface RenderOptions {
  categories?: CalendarCategory[];
  selectedSpaceId?: string | null;
  activeView?: "calendar" | "tasks";
}

interface Interactions {
  selectedSpaces: (string | null)[];
  viewChanges: ("calendar" | "tasks")[];
  createSpaceCalls: number;
}

async function renderRail(options: RenderOptions = {}) {
  const interactions: Interactions = {
    selectedSpaces: [],
    viewChanges: [],
    createSpaceCalls: 0,
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(IconRail, {
        categories: options.categories ?? [],
        selectedSpaceId: options.selectedSpaceId ?? null,
        onSelectSpace: (id) => interactions.selectedSpaces.push(id),
        activeView: options.activeView ?? "calendar",
        onViewChange: (view) => interactions.viewChanges.push(view),
        onCreateSpace: () => { interactions.createSpaceCalls++; },
      })
    )
  );
  return interactions;
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("IconRail", () => {
  it("renders the app mark (KalendMark)", async () => {
    await renderRail();

    // KalendMark renders with the .kalend-mark class.
    const mark = document.querySelector(".kalend-mark");
    expect(mark).not.toBeNull();
  });

  it("renders Calendar and Tasks view buttons; active has active styling", async () => {
    await renderRail({ activeView: "calendar" });

    const calBtn = byLabel("Calendar view");
    const tasksBtn = byLabel("Tasks view");
    expect(calBtn).not.toBeNull();
    expect(tasksBtn).not.toBeNull();

    // Active calendar button has the translucent-white fill class.
    expect(calBtn?.className).toContain("bg-white/[0.12]");
    // Inactive tasks button does not.
    expect(tasksBtn?.className).not.toContain("bg-white/[0.12]");
  });

  it("clicking a view button calls onViewChange", async () => {
    const interactions = await renderRail({ activeView: "calendar" });

    const tasksBtn = byLabel("Tasks view");
    await act(() => tasksBtn?.click());

    expect(interactions.viewChanges).toEqual(["tasks"]);
  });

  it("renders one Space tile per category with correct abbreviation", async () => {
    await renderRail({ categories: threeCategories });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Sc"); // School
    expect(text).toContain("Wo"); // Work
    expect(text).toContain("Fi"); // Fitness
  });

  it("clicking a Space tile calls onSelectSpace with its id", async () => {
    const interactions = await renderRail({ categories: threeCategories });

    const workBtn = byLabel("Work");
    await act(() => workBtn?.click());

    expect(interactions.selectedSpaces).toEqual(["cat-2"]);
  });

  it("clicking the active Space tile calls onSelectSpace(null) (deselect)", async () => {
    const interactions = await renderRail({
      categories: threeCategories,
      selectedSpaceId: "cat-2",
    });

    const workBtn = byLabel("Work");
    await act(() => workBtn?.click());

    expect(interactions.selectedSpaces).toEqual([null]);
  });

  it("each Space tile has a title attribute with the full Space name", async () => {
    await renderRail({ categories: threeCategories });

    for (const cat of threeCategories) {
      const btn = byLabel(cat.name);
      expect(btn).not.toBeNull();
      expect(btn?.getAttribute("title")).toBe(cat.name);
    }
  });

  it("active Space tile has the Space's color applied", async () => {
    await renderRail({
      categories: threeCategories,
      selectedSpaceId: "cat-1", // School, blue
    });

    const schoolBtn = byLabel("School");
    expect(schoolBtn).not.toBeNull();
    // Active blue Space tile should have the blue-500 fill.
    expect(schoolBtn?.className).toContain("bg-blue-500");
    expect(schoolBtn?.className).toContain("border-blue-400");
  });

  it("renders the '+' add button; clicking calls onCreateSpace", async () => {
    const interactions = await renderRail();

    const addBtn = byLabel("Create space");
    expect(addBtn).not.toBeNull();

    await act(() => addBtn?.click());

    expect(interactions.createSpaceCalls).toBe(1);
  });
});

describe("spaceAbbreviation", () => {
  it('"School" → "Sc"', () => {
    expect(spaceAbbreviation("School")).toBe("Sc");
  });

  it('"Work" → "Wo"', () => {
    expect(spaceAbbreviation("Work")).toBe("Wo");
  });

  it('"a" → "A"', () => {
    expect(spaceAbbreviation("a")).toBe("A");
  });

  it('"" → "??"', () => {
    expect(spaceAbbreviation("")).toBe("??");
  });
});
