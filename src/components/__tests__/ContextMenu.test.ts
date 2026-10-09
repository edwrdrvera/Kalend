import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement, Fragment } from "react";
import type { Root } from "react-dom/client";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: ContextMenu, useContextMenu } = await import("../ContextMenu");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

function Harness({ deleted }: { deleted: string[][] }) {
  const menu = useContextMenu();
  const ids = ["evt-1", "evt-2", "evt-3"];
  const children = createElement(
    Fragment,
    null,
    createElement("button", {
      type: "button",
      "data-testid": "event",
      onContextMenu: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        menu.show([
          { label: "Open details", onSelect: () => {} },
          { label: "Delete 3 events", destructive: true, onSelect: () => deleted.push(ids) },
        ]);
      },
    }, "Standup"),
    createElement("button", { type: "button", "data-testid": "gutter" }, "Gutter")
  );
  return createElement(ContextMenu, { menu }, children);
}

async function mount(deleted: string[][]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(Harness, { deleted })));
}

const key = (target: Element, init: KeyboardEventInit) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  });

const menuItems = () => [...document.querySelectorAll('[role="menuitem"]')];

describe("ContextMenu", () => {
  it("opens on a contextmenu event with the target's items, and ArrowDown then Enter runs Delete", async () => {
    const deleted: string[][] = [];
    await mount(deleted);
    const target = container!.querySelector('[data-testid="event"]')!;
    await act(() => {
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 50 }));
    });
    expect(menuItems().map((el) => el.textContent)).toEqual(["Open details", "Delete 3 events"]);
    const popup = document.querySelector('[role="menu"]')!;
    await key(popup, { key: "ArrowDown" });
    await key(document.activeElement!, { key: "ArrowDown" });
    await key(document.activeElement!, { key: "Enter" });
    expect(deleted).toEqual([["evt-1", "evt-2", "evt-3"]]);
  });

  it("opens on Shift+F10 from the focused target", async () => {
    await mount([]);
    const target = container!.querySelector<HTMLElement>('[data-testid="event"]')!;
    target.focus();
    await key(target, { key: "F10", shiftKey: true });
    expect(menuItems().length).toBe(2);
  });

  it("opens on the ContextMenu key", async () => {
    await mount([]);
    const target = container!.querySelector<HTMLElement>('[data-testid="event"]')!;
    await key(target, { key: "ContextMenu" });
    expect(menuItems().length).toBe(2);
  });

  it("stays closed when the target reported no items", async () => {
    await mount([]);
    const gutter = container!.querySelector<HTMLElement>('[data-testid="gutter"]')!;
    await key(gutter, { key: "F10", shiftKey: true });
    expect(menuItems().length).toBe(0);
  });
});
