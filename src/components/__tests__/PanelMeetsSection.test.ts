import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: PanelMeetsSection } = await import("../PanelMeetsSection");
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

async function render(meets: { label: string; pattern: string }[]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(PanelMeetsSection, { meets })));
}

describe("PanelMeetsSection", () => {
  it("renders each meet as a label/pattern row", async () => {
    await render(FIXTURE_BRANCH_FULL.meets);

    expect(container?.textContent).toContain("Lecture");
    expect(container?.textContent).toContain("Tue, Thu · 10:00");
    expect(container?.textContent).toContain("Lab");
    expect(container?.textContent).toContain("Fri · 14:00");
  });

  it("renders the MEETS section label", async () => {
    await render(FIXTURE_BRANCH_FULL.meets);

    expect(document.querySelector("h3")?.textContent).toBe("Meets");
  });

  it("returns null when there are no meets", async () => {
    await render(FIXTURE_BRANCH_SPARSE.meets);

    expect(container?.innerHTML).toBe("");
  });
});
