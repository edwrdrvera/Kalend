import "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { CalendarGroup } from "@/lib/calendar-types";
import { typeInto } from "./test-dom";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: GroupEditorDialog, deleteOutcome } = await import("../GroupEditorDialog");
type Target = import("../GroupEditorDialog").GroupEditorTarget;

const BIO: CalendarGroup = { id: "bio", category_id: "school", name: "BIO 102" };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

async function render(target: Target | null, overrides: Partial<Record<"create" | "rename" | "remove", () => Promise<unknown>>> = {}) {
  const calls = { creates: [] as unknown[][], renames: [] as unknown[][], deletes: [] as string[], closes: 0 };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(GroupEditorDialog, {
        target,
        onOpenChange: (open: boolean) => {
          if (!open) calls.closes++;
        },
        onCreate: async (spaceId: string, name: string) => {
          calls.creates.push([spaceId, name]);
          await overrides.create?.();
        },
        onRename: async (group: CalendarGroup, name: string) => {
          calls.renames.push([group.id, name]);
          await overrides.rename?.();
        },
        onDelete: async (group: CalendarGroup) => {
          calls.deletes.push(group.id);
          await overrides.remove?.();
        },
      })
    )
  );
  return calls;
}

const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const nameInput = () => document.querySelector<HTMLInputElement>("[aria-label='Group name']")!;
const buttonWithText = (text: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
const dialogText = () => document.querySelector("[role='dialog']")?.textContent ?? "";

const CREATE: Target = { mode: "create", spaceId: "school", spaceName: "School" };
const EDIT: Target = { mode: "edit", group: BIO, spaceName: "School", eventCount: 2, taskCount: 1 };

describe("deleteOutcome", () => {
  it("counts what stays in the Space", () => {
    expect(deleteOutcome("School", 2, 1)).toBe(
      "Its 2 events and 1 task stay in School, but are no longer in this Group. This can't be undone."
    );
    expect(deleteOutcome("School", 1, 0)).toContain("Its 1 event stay in School");
    expect(deleteOutcome("School", 0, 3)).toContain("Its 3 tasks stay in School");
  });

  it("says so when the Group is empty", () => {
    expect(deleteOutcome("School", 0, 0)).toContain("no events or tasks");
  });
});

describe("GroupEditorDialog", () => {
  it("renders nothing without a target", async () => {
    await render(null);
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("creates a Group in the Space with the trimmed-by-server name and closes", async () => {
    const calls = await render(CREATE);
    expect(dialogText()).toContain("New Group in School");
    await act(async () => typeInto(nameInput(), "HIST 201"));
    await act(() => buttonWithText("Create")?.click());
    expect(calls.creates).toEqual([["school", "HIST 201"]]);
    expect(calls.closes).toBe(1);
  });

  it("will not submit a blank name", async () => {
    const calls = await render(CREATE);
    await act(async () => typeInto(nameInput(), "   "));
    expect(buttonWithText("Create")?.hasAttribute("disabled")).toBe(true);
    expect(calls.creates).toEqual([]);
  });

  it("shows the server's message and stays open when create fails", async () => {
    const calls = await render(CREATE, { create: () => Promise.reject(new Error("The selected Space is unavailable")) });
    await act(async () => typeInto(nameInput(), "HIST 201"));
    await act(() => buttonWithText("Create")?.click());
    expect(dialogText()).toContain("The selected Space is unavailable");
    expect(calls.closes).toBe(0);
  });

  it("starts an edit with the current name and renames", async () => {
    const calls = await render(EDIT);
    expect(nameInput().value).toBe("BIO 102");
    await act(async () => typeInto(nameInput(), "Biology"));
    await act(() => buttonWithText("Save")?.click());
    expect(calls.renames).toEqual([["bio", "Biology"]]);
    expect(calls.closes).toBe(1);
  });

  it("closes without a request when the name did not change", async () => {
    const calls = await render(EDIT);
    await act(() => buttonWithText("Save")?.click());
    expect(calls.renames).toEqual([]);
    expect(calls.closes).toBe(1);
  });

  it("asks before deleting, says what happens, and Cancel changes nothing", async () => {
    const calls = await render(EDIT);
    await act(() => byLabel("Delete Group")?.click());
    expect(dialogText()).toContain("Delete BIO 102?");
    expect(dialogText()).toContain("Its 2 events and 1 task stay in School");
    expect(calls.deletes).toEqual([]);
    await act(() => buttonWithText("Cancel")?.click());
    expect(nameInput().value).toBe("BIO 102");
    expect(calls.deletes).toEqual([]);
  });

  it("deletes after the confirmation and closes", async () => {
    const calls = await render(EDIT);
    await act(() => byLabel("Delete Group")?.click());
    await act(() => byLabel("Confirm delete Group")?.click());
    expect(calls.deletes).toEqual(["bio"]);
    expect(calls.closes).toBe(1);
  });

  it("keeps the dialog open with the error when the delete fails", async () => {
    const calls = await render(EDIT, { remove: () => Promise.reject(new Error("Group not found")) });
    await act(() => byLabel("Delete Group")?.click());
    await act(() => byLabel("Confirm delete Group")?.click());
    expect(dialogText()).toContain("Group not found");
    expect(calls.closes).toBe(0);
  });
});
