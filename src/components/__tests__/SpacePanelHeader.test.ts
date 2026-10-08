import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

// Install DOM globals before importing React DOM (see test-dom.ts).
const { typeInto } = await import("./test-dom");

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
  renames: string[];
}

async function renderHeader(subject: PanelSubject = GROUP) {
  const interactions: Interactions = { closed: false, renames: [] };
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
        onRename: async (name: string) => {
          interactions.renames.push(name);
          return true;
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

  it("renames a Group once when Enter is followed by the box losing focus", async () => {
    const interactions = await renderHeader(GROUP);
    await act(() => byLabel("Rename CS 340")?.click());
    const input = byLabel("CS 340 name") as HTMLInputElement;
    await act(() => typeInto(input, "CS 341"));
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      input.dispatchEvent(new Event("focusout", { bubbles: true }));
    });
    expect(interactions.renames).toEqual(["CS 341"]);
  });

  it("has a decorative, aria-hidden color mark", async () => {
    await renderHeader();

    const mark = container?.querySelector('[aria-hidden="true"]');
    expect(mark).not.toBeNull();
  });
});

describe("SpacePanelHeader rename across a panel switch", () => {
  it("does not show a failed rename under the Space the panel switched to", async () => {
    let finishRename: (ok: boolean) => void = () => {};
    const onRename = () => new Promise<boolean>((resolve) => (finishRename = resolve));
    const mount = (subject: PanelSubject) =>
      act(() => root?.render(createElement(SpacePanelHeader, { subject, onClose: () => {}, onRename })));

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await mount(GROUP);
    await act(() => byLabel("Rename CS 340")?.click());
    const input = byLabel("CS 340 name") as HTMLInputElement;
    await act(() => typeInto(input, "CS 341"));
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    await mount(SPACE);
    await act(async () => finishRename(false));

    expect(document.querySelector("h2")?.textContent).toBe("School");
    expect(container?.textContent).not.toContain("Couldn't rename");
  });
});
