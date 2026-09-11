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
  onCreateCategory?: (name: string, color: string) => Promise<void>;
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
        onCreateCategory: options.onCreateCategory ?? (async () => {}),
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

function pointerDown(element: HTMLElement) {
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

async function openActions(name: string) {
  await act(() => byLabel(`More actions for ${name}`)?.click());
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
    expect(selected?.parentElement?.querySelector(".absolute.inset-y-1\\.5")).not.toBeNull();
  });

  it("leads with a passive color swatch and dims it when hidden", async () => {
    await renderManager({ hiddenCategoryIds: ["space-1"] });

    // The swatch is a plain span, not a button — it identifies color, nothing else.
    const workRow = nameButton("Work")?.parentElement;
    const swatch = workRow?.querySelector("span.size-3");
    expect(swatch).not.toBeNull();
    expect(swatch?.className).toContain("opacity-30");
    expect(swatch?.className).toContain("grayscale");

    // Visible spaces have a full-color swatch without dimming.
    const personalRow = nameButton("Personal")?.parentElement;
    const personalSwatch = personalRow?.querySelector("span.size-3");
    expect(personalSwatch).not.toBeNull();
    expect(personalSwatch?.className).not.toContain("opacity-30");
  });

  it("shows the visibility toggle on hover alongside the ellipsis", async () => {
    await renderManager({ hiddenCategoryIds: ["space-1"] });

    // The visibility toggle exists and has the correct label.
    const visibility = byLabel("Show Work on calendar");
    expect(visibility).not.toBeNull();
    expect(visibility?.querySelector("svg")).not.toBeNull();

    // Hidden spaces still use muted text without line-through.
    expect(nameButton("Work")?.className).toContain("opacity-65");
    expect(nameButton("Work")?.className).not.toContain("line-through");
  });

  it("keeps the selected row actions visible without hover", async () => {
    await renderManager({ selectedSpaceId: "space-1" });

    // Both the visibility toggle and the ellipsis stay visible on selected rows.
    expect(byLabel("Hide Work on calendar")?.className).toContain("md:opacity-100");
    expect(byLabel("More actions for Work")?.className).toContain("md:opacity-100");

    // Non-selected rows reveal on hover/focus.
    expect(byLabel("Hide Personal on calendar")?.className).toContain("md:group-hover:opacity-100");
    expect(byLabel("More actions for Personal")?.className).toContain("md:group-focus-within:opacity-100");
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
    await openActions("Work");
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
    await openActions("Work");
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
    await openActions("Work");
    await act(async () => byLabel("Delete Work")?.click());

    expect(container?.textContent).toContain("The selected Space is unavailable");
    expect(nameButton("Work")).toBeDefined();
    expect(byLabel("Delete Work")?.hasAttribute("disabled")).toBe(false);
  });
});

describe("CategoryManager rename", () => {
  it("commits an inline rename on Enter", async () => {
    const calls = await renderManager();

    expect(byLabel("Rename Work")).toBeNull();
    await openActions("Work");
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

    await openActions("Work");
    await act(() => byLabel("Rename Work")?.click());
    const input = byLabel("Space name") as HTMLInputElement | null;
    await act(() => typeInto(input as HTMLInputElement, "Discarded"));
    await act(() => pressKey(input as HTMLInputElement, "Escape"));

    expect(calls.updated).toEqual([]);
    expect(byLabel("Space name")).toBeNull();
    expect(nameButton("Work")).toBeDefined();

    // Reopening the editor shows the saved name, not the discarded draft.
    await openActions("Work");
    await act(() => byLabel("Rename Work")?.click());
    expect((byLabel("Space name") as HTMLInputElement).value).toBe("Work");
  });

  it("offers edit actions from one contextual control", async () => {
    await renderManager();

    expect(byLabel("More actions for Work")).not.toBeNull();
    expect(byLabel("Rename Work")).toBeNull();
    expect(byLabel("Delete Work")).toBeNull();

    await openActions("Work");

    expect(byLabel("Rename Work")).not.toBeNull();
    expect(byLabel("Change color, currently green")).not.toBeNull();
    expect(byLabel("Delete Work")).not.toBeNull();
  });
});

describe("CategoryManager creation drafts", () => {
  it("closes an empty composer on outside interaction", async () => {
    await renderManager();
    await act(() => byLabel("Create a Space")?.click());

    await act(() => pointerDown(nameButton("Work") as HTMLButtonElement));
    expect(byLabel("New Space name")).toBeNull();
    expect(byLabel("Space draft saved")).toBeNull();
  });

  it("collapses on outside interaction and restores a nonempty draft", async () => {
    await renderManager();
    await act(() => byLabel("Create a Space")?.click());
    const input = byLabel("New Space name") as HTMLInputElement;
    await act(() => typeInto(input, "Research"));

    await act(() => pointerDown(nameButton("Work") as HTMLButtonElement));
    expect(byLabel("New Space name")).toBeNull();
    expect(byLabel("Space draft saved")).not.toBeNull();

    await act(() => byLabel("Create a Space")?.click());
    expect((byLabel("New Space name") as HTMLInputElement).value).toBe("Research");
  });

  it("discards the draft on Escape", async () => {
    await renderManager();
    await act(() => byLabel("Create a Space")?.click());
    await act(() => typeInto(byLabel("New Space name") as HTMLInputElement, "Discard me"));
    await act(() => pressKey(byLabel("New Space name") as HTMLInputElement, "Escape"));

    expect(byLabel("New Space name")).toBeNull();
    expect(byLabel("Space draft saved")).toBeNull();
    await act(() => byLabel("Create a Space")?.click());
    expect((byLabel("New Space name") as HTMLInputElement).value).toBe("");
  });

  it("discards the draft from Cancel", async () => {
    await renderManager();
    await act(() => byLabel("Create a Space")?.click());
    await act(() => typeInto(byLabel("New Space name") as HTMLInputElement, "Discard me"));
    await act(() => byLabel("Cancel")?.click());

    expect(byLabel("Space draft saved")).toBeNull();
    await act(() => byLabel("Create a Space")?.click());
    expect((byLabel("New Space name") as HTMLInputElement).value).toBe("");
  });

  it("does not dismiss while choosing a color from the portaled picker", async () => {
    await renderManager();
    await act(() => byLabel("Create a Space")?.click());
    await act(() => byLabel("Change color, currently blue")?.click());
    const green = byLabel("green");
    expect(green).not.toBeNull();

    await act(() => pointerDown(green as HTMLButtonElement));
    await act(() => green?.click());
    expect(byLabel("New Space name")).not.toBeNull();
    expect(byLabel("Change color, currently green")).not.toBeNull();
  });

  it("clears the draft after successful creation", async () => {
    const created: Array<{ name: string; color: string }> = [];
    await renderManager({
      onCreateCategory: async (name, color) => {
        created.push({ name, color });
      },
    });
    await act(() => byLabel("Create a Space")?.click());
    await act(() => typeInto(byLabel("New Space name") as HTMLInputElement, "Research"));
    await act(async () => byLabel("Add Space")?.click());

    expect(created).toEqual([{ name: "Research", color: "blue" }]);
    expect(byLabel("New Space name")).toBeNull();
    expect(byLabel("Space draft saved")).toBeNull();
  });
});
