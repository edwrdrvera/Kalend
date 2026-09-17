import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: PanelLinksSection } = await import("../PanelLinksSection");
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

async function render(links: (typeof FIXTURE_BRANCH_FULL)["links"]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(PanelLinksSection, { links })));
}

describe("PanelLinksSection", () => {
  it("renders each link with a safe target/rel", async () => {
    await render(FIXTURE_BRANCH_FULL.links);

    const anchors = Array.from(document.querySelectorAll("a"));
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.getAttribute("target")).toBe("_blank");
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    }
    expect(anchors[0]?.getAttribute("href")).toBe("https://example.edu/cs340");
    expect(anchors[0]?.textContent).toContain("Course syllabus");
  });

  it("returns null when there are no links", async () => {
    await render(FIXTURE_BRANCH_SPARSE.links);

    expect(container?.innerHTML).toBe("");
  });
});
