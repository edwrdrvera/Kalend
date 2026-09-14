import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: PanelPeopleSection } = await import("../PanelPeopleSection");
const { FIXTURE_BRANCH_FULL, FIXTURE_BRANCH_SPARSE } = await import(
  "@/lib/branch-fixtures"
);

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

async function render(people: (typeof FIXTURE_BRANCH_FULL)["people"]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(PanelPeopleSection, { people })));
}

describe("PanelPeopleSection", () => {
  it("renders each person's name and role", async () => {
    await render(FIXTURE_BRANCH_FULL.people);

    expect(container?.textContent).toContain("Dr. Wolfe");
    expect(container?.textContent).toContain("Instructor");
    expect(container?.textContent).toContain("Priya Nair");
    expect(container?.textContent).toContain("TA");
  });

  it("falls back to initials when there is no avatar", async () => {
    await render(FIXTURE_BRANCH_FULL.people);

    expect(container?.textContent).toContain("DW");
    expect(document.querySelector("img")).toBeNull();
  });

  it("renders an avatar image when avatarUrl is present", async () => {
    await render([
      { id: "p1", name: "Ada Lovelace", role: "Mentor", avatarUrl: "https://example.com/a.png" },
    ]);

    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
  });

  it("returns null when there are no people", async () => {
    await render(FIXTURE_BRANCH_SPARSE.people);

    expect(container?.innerHTML).toBe("");
  });
});
