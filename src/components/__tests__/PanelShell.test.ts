import { afterEach, describe, expect, it } from "bun:test";
import { createElement, act } from "react";
import type { Root } from "react-dom/client";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: PanelShell } = await import("../PanelShell");

let root: Root | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function renderPanel(modal: boolean) {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(
        PanelShell,
        { label: "Space", modal, onClose: () => {} },
        createElement("button", { id: "first" }, "first"),
        createElement("button", { id: "last" }, "last")
      )
    )
  );
  const panel = container.querySelector<HTMLElement>('[aria-label="Space"]');
  if (!panel) throw new Error("panel did not render");
  return panel;
}

async function pressTab(target: HTMLElement, shiftKey: boolean) {
  const ev = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
  await act(() => {
    target.dispatchEvent(ev);
  });
  return { prevented: ev.defaultPrevented, focus: (document.activeElement as HTMLElement | null)?.id };
}

describe("PanelShell focus trap", () => {
  it("wraps Shift+Tab from the just-opened panel to the last control", async () => {
    const panel = await renderPanel(true);
    expect(document.activeElement).toBe(panel);
    expect(await pressTab(panel, true)).toEqual({ prevented: true, focus: "last" });
  });

  it("moves Tab from the just-opened panel to the first control", async () => {
    const panel = await renderPanel(true);
    expect(await pressTab(panel, false)).toEqual({ prevented: true, focus: "first" });
  });

  it("wraps Shift+Tab from the first control to the last", async () => {
    const panel = await renderPanel(true);
    const first = panel.querySelector<HTMLElement>("#first");
    first?.focus();
    expect(await pressTab(first as HTMLElement, true)).toEqual({ prevented: true, focus: "last" });
  });

  it("wraps Tab from the last control to the first", async () => {
    const panel = await renderPanel(true);
    const last = panel.querySelector<HTMLElement>("#last");
    last?.focus();
    expect(await pressTab(last as HTMLElement, false)).toEqual({ prevented: true, focus: "first" });
  });

  it("lets focus leave a non-modal panel", async () => {
    const panel = await renderPanel(false);
    expect((await pressTab(panel, true)).prevented).toBe(false);
  });
});
