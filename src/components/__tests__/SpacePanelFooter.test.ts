import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";

await import("./test-dom");

const { createRoot } = await import("react-dom/client");
const { default: SpacePanelFooter } = await import("../SpacePanelFooter");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

describe("SpacePanelFooter", () => {
  it("renders a labeled settings button", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(() =>
      root?.render(createElement(SpacePanelFooter, { onOpenSettings: () => {} }))
    );

    const button = document.querySelector('[aria-label="Space settings"]');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Space settings");
  });

  it("calls onOpenSettings when clicked", async () => {
    let opened = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(() =>
      root?.render(
        createElement(SpacePanelFooter, {
          onOpenSettings: () => {
            opened = true;
          },
        })
      )
    );

    document
      .querySelector('[aria-label="Space settings"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(opened).toBe(true);
  });
});
