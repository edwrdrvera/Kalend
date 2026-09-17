import "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { Branch } from "@/lib/branch-types";

// DOM globals must be installed (test-dom above) before importing react-dom.
const { createRoot } = await import("react-dom/client");
const { default: BranchList } = await import("../BranchList");

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: "b1",
    spaceId: "s1",
    spaceName: "School",
    name: "CS 340",
    color: "blue",
    description: null,
    meets: [],
    people: [],
    links: [],
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

async function render(branches: Branch[], activeBranchId: string | null = null) {
  const opened: string[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(BranchList, {
        branches,
        activeBranchId,
        onOpenBranch: (b) => opened.push(b.id),
      })
    )
  );
  return opened;
}

describe("BranchList", () => {
  it("renders nothing when there are no branches", async () => {
    await render([]);
    expect(container?.textContent).toBe("");
  });

  it("renders a row per branch", async () => {
    await render([
      makeBranch({ id: "b1", name: "CS 340" }),
      makeBranch({ id: "b2", name: "MATH 210" }),
    ]);
    expect(container?.textContent).toContain("CS 340");
    expect(container?.textContent).toContain("MATH 210");
  });

  it("fires onOpenBranch with the clicked branch", async () => {
    const opened = await render([makeBranch({ id: "b1", name: "CS 340" })]);
    const button = document.querySelector<HTMLButtonElement>("button");
    await act(() => button?.click());
    expect(opened).toEqual(["b1"]);
  });

  it("marks the active branch with aria-current", async () => {
    await render([makeBranch({ id: "b1" })], "b1");
    const button = document.querySelector<HTMLButtonElement>("button");
    expect(button?.getAttribute("aria-current")).toBe("true");
  });
});
