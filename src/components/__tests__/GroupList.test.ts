import "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarGroup } from "@/lib/calendar-types";
import type { PanelSubject } from "@/lib/panel-subject";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: GroupList } = await import("../GroupList");

const SCHOOL = { id: "school", name: "School", color: "blue" as const };
const BIO: CalendarGroup = { id: "bio", category_id: "school", name: "BIO 102" };
const HIST: CalendarGroup = { id: "hist", category_id: "school", name: "HIST 201" };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

async function render(groups: CalendarGroup[], activeSubject: PanelSubject | null = null) {
  const calls = { spaces: [] as string[], groups: [] as string[], creates: [] as string[], edits: [] as string[] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(GroupList, {
        space: SCHOOL,
        groups,
        activeSubject,
        onOpenSpace: (id: string) => calls.spaces.push(id),
        onOpenGroup: (g: CalendarGroup) => calls.groups.push(g.id),
        onCreateGroup: (id: string) => calls.creates.push(id),
        onEditGroup: (g: CalendarGroup) => calls.edits.push(g.id),
      })
    )
  );
  return calls;
}

const byLabel = (label: string) => document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
const buttonWithText = (text: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === text);

describe("GroupList", () => {
  it("lists the Space first, then each Group", async () => {
    await render([BIO, HIST]);
    const labels = [...document.querySelectorAll("button")].map((b) => b.textContent);
    expect(labels.indexOf("School")).toBeLessThan(labels.indexOf("BIO 102"));
    expect(labels).toContain("HIST 201");
    expect(container?.textContent).toContain("Groups");
  });

  it("opens the Space overview from the Space row", async () => {
    const calls = await render([BIO]);
    await act(() => buttonWithText("School")?.click());
    expect(calls.spaces).toEqual(["school"]);
  });

  it("opens a Group from its row", async () => {
    const calls = await render([BIO, HIST]);
    await act(() => buttonWithText("HIST 201")?.click());
    expect(calls.groups).toEqual(["hist"]);
  });

  it("offers to create a Group from the plus button, and from the empty state", async () => {
    const calls = await render([]);
    await act(() => byLabel("New Group")?.click());
    await act(() => buttonWithText("Create a Group")?.click());
    expect(calls.creates).toEqual(["school", "school"]);
  });

  it("hides the empty-state prompt once the Space has a Group", async () => {
    await render([BIO]);
    expect(buttonWithText("Create a Group")).toBeUndefined();
  });

  it("asks to edit a Group from its pencil", async () => {
    const calls = await render([BIO]);
    await act(() => byLabel("Edit Group BIO 102")?.click());
    expect(calls.edits).toEqual(["bio"]);
  });

  it("marks only the open Group as current", async () => {
    await render([BIO, HIST], { kind: "group", groupId: "bio", name: "BIO 102", spaceId: "school", spaceName: "School", color: "blue" });
    expect(buttonWithText("BIO 102")?.getAttribute("aria-current")).toBe("true");
    expect(buttonWithText("HIST 201")?.getAttribute("aria-current")).toBeNull();
    expect(buttonWithText("School")?.getAttribute("aria-current")).toBeNull();
  });

  it("marks the Space as current when its overview is open", async () => {
    await render([BIO], { kind: "space", spaceId: "school", name: "School", color: "blue", description: null });
    expect(buttonWithText("School")?.getAttribute("aria-current")).toBe("true");
    expect(buttonWithText("BIO 102")?.getAttribute("aria-current")).toBeNull();
  });
});
