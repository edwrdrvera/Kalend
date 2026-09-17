import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

// Install DOM globals before importing React DOM (see test-dom.ts).
await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: SpacePanelHeader } = await import("../SpacePanelHeader");
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

interface Interactions {
  closed: boolean;
  overflowed: boolean;
}

async function renderHeader(branch = FIXTURE_BRANCH_FULL) {
  const interactions: Interactions = { closed: false, overflowed: false };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(SpacePanelHeader, {
        branch,
        onClose: () => {
          interactions.closed = true;
        },
        onOverflow: () => {
          interactions.overflowed = true;
        },
      })
    )
  );
  return interactions;
}

function byLabel(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

describe("SpacePanelHeader", () => {
  it("renders the space name, branch name, and description", async () => {
    await renderHeader();

    expect(container?.textContent).toContain("School");
    expect(container?.textContent).toContain("CS 340");
    expect(container?.textContent).toContain("Databases & Information Systems. Wolfe 214.");
  });

  it("collapses the description line when null", async () => {
    await renderHeader(FIXTURE_BRANCH_SPARSE);

    const heading = document.querySelector("h2");
    expect(heading?.textContent).toBe("Weekend plans");
    // No paragraph other than a possible description should carry text —
    // simplest check: nothing in the DOM equals a description string.
    const paragraphs = Array.from(document.querySelectorAll("p"));
    const spaceNameParagraph = paragraphs.find((p) => p.textContent === "Personal");
    expect(spaceNameParagraph).toBeDefined();
    expect(paragraphs.length).toBe(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const interactions = await renderHeader();

    byLabel("Close panel")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
    expect(interactions.closed).toBe(true);
  });

  it("calls onOverflow when the overflow button is clicked", async () => {
    const interactions = await renderHeader();

    byLabel("Branch options")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
    expect(interactions.overflowed).toBe(true);
  });

  it("has a decorative, aria-hidden color mark", async () => {
    await renderHeader();

    const mark = container?.querySelector('[aria-hidden="true"]');
    expect(mark).not.toBeNull();
  });
});
