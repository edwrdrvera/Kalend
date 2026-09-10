import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarCategory } from "@/lib/calendar-types";
import { testWindow, typeInto } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: CategoryManager } = await import("../CategoryManager");

const categories: CalendarCategory[] = [
  { id: "space-1", name: "Work", color: "green" },
  { id: "space-2", name: "Personal", color: "purple" },
];

/** `CategoryManager` gates deletion on the global `window.confirm`. happy-dom
 *  does not declare one, so reach it through a narrow view of the window. */
const confirmHost = testWindow as unknown as { confirm?: (message?: string) => boolean };
const originalConfirm = confirmHost.confirm;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
  localStorage.clear();
  confirmHost.confirm = originalConfirm;
});

interface Calls {
  selected: (string | null)[];
  toggled: string[];
  updated: { category: CalendarCategory; updates: { name?: string; color?: string } }[];
  deleted: CalendarCategory[];
}

interface RenderOptions {
  selectedSpaceId?: string | null;
  hiddenCategoryIds?: string[];
  loading?: boolean;
  onDeleteCategory?: (category: CalendarCategory) => Promise<void>;
}

async function renderManager(options: RenderOptions = {}) {
  const calls: Calls = { selected: [], toggled: [], updated: [], deleted: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(CategoryManager, {
        categories,
        loading: options.loading ?? false,
        selectedSpaceId: options.selectedSpaceId ?? null,
        onSelectSpace: (spaceId) => calls.selected.push(spaceId),
        hiddenCategoryIds: options.hiddenCategoryIds ?? [],
        onToggleCategoryVisibility: (categoryId) => calls.toggled.push(categoryId),
        onCreateCategory: async () => {},
        onUpdateCategory: (category, updates) => calls.updated.push({ category, updates }),
        onDeleteCategory:
          options.onDeleteCategory ??
          (async (category) => {
            calls.deleted.push(category);
          }),
      })
    )
  );
  return calls;
}

/** The Space's selection button, found by its visible name. */
function nameButton(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent?.trim() === name && !button.hasAttribute("aria-label")
  );
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

function pressKey(element: HTMLElement, key: string) {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("CategoryManager selection", () => {
  it("selects a Space from its name button and clears selection from All Spaces", async () => {
    const calls = await renderManager({ selectedSpaceId: null });

    await act(() => nameButton("Work")?.click());
    expect(calls.selected).toEqual(["space-1"]);

    await act(() => nameButton("Personal")?.click());
    expect(calls.selected).toEqual(["space-1", "space-2"]);

    await act(() => nameButton("All Spaces")?.click());
    expect(calls.selected).toEqual(["space-1", "space-2", null]);
  });

  it("keeps visibility separate from selection", async () => {
    const calls = await renderManager({ selectedSpaceId: null });

    await act(() => byLabel("Hide Work on calendar")?.click());
    expect(calls.toggled).toEqual(["space-1"]);
    expect(calls.selected).toEqual([]);
  });

  it("labels the visibility control by what the next click will do", async () => {
    await renderManager({ hiddenCategoryIds: ["space-1"] });

    expect(byLabel("Show Work on calendar")).not.toBeNull();
    expect(byLabel("Hide Work on calendar")).toBeNull();
    expect(byLabel("Hide Personal on calendar")).not.toBeNull();
  });

  it("marks the selected Space with aria-current and a cue that is not colour", async () => {
    await renderManager({ selectedSpaceId: "space-1" });

    const selected = nameButton("Work");
    const unselected = nameButton("Personal");
    expect(selected?.getAttribute("aria-current")).toBe("true");
    expect(unselected?.getAttribute("aria-current")).toBeNull();
    expect(nameButton("All Spaces")?.getAttribute("aria-current")).toBeNull();

    // Weight, not just a tinted background, distinguishes the selected row.
    expect(selected?.className).toContain("font-semibold");
    expect(unselected?.className).not.toContain("font-semibold");
  });

  it("marks All Spaces as current when nothing is focused", async () => {
    await renderManager({ selectedSpaceId: null });

    expect(nameButton("All Spaces")?.getAttribute("aria-current")).toBe("true");
    expect(nameButton("Work")?.getAttribute("aria-current")).toBeNull();
  });
});

describe("CategoryManager deletion", () => {
  it("does not delete when the confirmation is declined", async () => {
    const messages: string[] = [];
    confirmHost.confirm = (message?: string) => {
      messages.push(message ?? "");
      return false;
    };

    const calls = await renderManager();
    await act(async () => byLabel("Delete Work")?.click());

    expect(calls.deleted).toEqual([]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Work");
    expect(messages[0]).toContain("Events and Tasks");
    expect(messages[0]).toContain("remain");
    expect(messages[0]).toContain("unassigned");
  });

  it("deletes once the confirmation is accepted", async () => {
    confirmHost.confirm = () => true;

    const calls = await renderManager();
    await act(async () => byLabel("Delete Work")?.click());

    expect(calls.deleted).toEqual([categories[0]]);
  });

  it("shows the failure and keeps the Space when deletion rejects", async () => {
    confirmHost.confirm = () => true;

    await renderManager({
      onDeleteCategory: async () => {
        throw new Error("The selected Space is unavailable");
      },
    });
    await act(async () => byLabel("Delete Work")?.click());

    expect(container?.textContent).toContain("The selected Space is unavailable");
    expect(nameButton("Work")).toBeDefined();
    expect(byLabel("Delete Work")?.hasAttribute("disabled")).toBe(false);
  });
});

describe("CategoryManager rename", () => {
  it("commits an inline rename on Enter", async () => {
    const calls = await renderManager();

    await act(() => byLabel("Rename Work")?.click());
    const input = byLabel("Space name") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.value).toBe("Work");

    await act(() => typeInto(input as HTMLInputElement, "Deep Work"));
    expect((byLabel("Space name") as HTMLInputElement).value).toBe("Deep Work");

    await act(() => pressKey(input as HTMLInputElement, "Enter"));
    expect(calls.updated).toEqual([{ category: categories[0], updates: { name: "Deep Work" } }]);
    // Committing leaves edit mode.
    expect(byLabel("Space name")).toBeNull();
  });

  it("discards an inline rename on Escape", async () => {
    const calls = await renderManager();

    await act(() => byLabel("Rename Work")?.click());
    const input = byLabel("Space name") as HTMLInputElement | null;
    await act(() => typeInto(input as HTMLInputElement, "Discarded"));
    await act(() => pressKey(input as HTMLInputElement, "Escape"));

    expect(calls.updated).toEqual([]);
    expect(byLabel("Space name")).toBeNull();
    expect(nameButton("Work")).toBeDefined();

    // Reopening the editor shows the saved name, not the discarded draft.
    await act(() => byLabel("Rename Work")?.click());
    expect((byLabel("Space name") as HTMLInputElement).value).toBe("Work");
  });
});
