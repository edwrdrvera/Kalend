import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

// Install DOM globals before importing React DOM (see test-dom.ts).
await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: SpacePanelHeader } = await import("../SpacePanelHeader");
import type { PanelSubject } from "@/lib/panel-subject";

const SPACE: PanelSubject = { kind: "space", spaceId: "school", name: "School", color: "blue", description: "Databases & Information Systems." };
const GROUP: PanelSubject = { kind: "group", groupId: "cs340", name: "CS 340", spaceId: "school", spaceName: "School", color: "blue" };

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

async function renderHeader(subject: PanelSubject = GROUP) {
  const interactions: Interactions = { closed: false, overflowed: false };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(() =>
    root?.render(
      createElement(SpacePanelHeader, {
        subject,
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
  it("shows the Space name above the Group name, leaving the description to the body", async () => {
    await renderHeader(GROUP);

    expect(container?.textContent).toContain("School");
    expect(container?.querySelector("h2")?.textContent).toBe("CS 340");
    expect(container?.textContent).not.toContain("Databases & Information Systems");
  });

  it("shows only the Space name as the heading for a Space", async () => {
    await renderHeader(SPACE);

    expect(document.querySelector("h2")?.textContent).toBe("School");
    const paragraphs = Array.from(document.querySelectorAll("p"));
    expect(paragraphs.map((p) => p.textContent)).toEqual(["Space"]);
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

    byLabel("Group options")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
    expect(interactions.overflowed).toBe(true);
  });

  it("names the overflow button for what is open", async () => {
    await renderHeader(SPACE);
    expect(byLabel("Space options")).not.toBeNull();
    expect(byLabel("Group options")).toBeNull();
  });

  it("has a decorative, aria-hidden color mark", async () => {
    await renderHeader();

    const mark = container?.querySelector('[aria-hidden="true"]');
    expect(mark).not.toBeNull();
  });
});
