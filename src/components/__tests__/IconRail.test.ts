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
}

interface Interactions {
  selectedSpaces: (string | null)[];
  createSpaceCalls: number;
}

async function renderRail(options: RenderOptions = {}) {
  const interactions: Interactions = {
    selectedSpaces: [],
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
        onCreateSpace: () => { interactions.createSpaceCalls++; },
        onEditSpace: () => {},
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

  it("does not render a Tasks view toggle (removed until the view exists)", async () => {
    await renderRail();

    // The dead Calendar/Tasks toggle was removed; neither button should exist.
    expect(byLabel("Calendar view")).toBeNull();
    expect(byLabel("Tasks view")).toBeNull();
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
    // Active blue Space tile should have the harmonized blue solid fill.
    expect(schoolBtn?.className).toContain("bg-[var(--evt-blue-solid)]");
    expect(schoolBtn?.className).toContain("border-[var(--evt-blue-solid)]");
  });

  it("renders the '+' add button; clicking calls onCreateSpace", async () => {
    const interactions = await renderRail();

    const addBtn = byLabel("Create space");
    expect(addBtn).not.toBeNull();

    await act(() => addBtn?.click());

    expect(interactions.createSpaceCalls).toBe(1);
  });

  it('renders a "View all spaces" button; clicking calls onSelectSpace(null)', async () => {
    const interactions = await renderRail({ selectedSpaceId: "cat-2" });

    const viewAllBtn = byLabel("View all spaces");
    expect(viewAllBtn).not.toBeNull();

    await act(() => viewAllBtn?.click());

    expect(interactions.selectedSpaces).toEqual([null]);
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
