import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: MiniCalendar } = await import("../MiniCalendar");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderMiniCalendar(collapsible = false) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  return act(() =>
    root?.render(createElement(MiniCalendar, {
      currentDate: new Date(2030, 8, 9),
      viewDate: new Date(2030, 8, 9),
      onDateSelect: () => {},
      collapsible,
    }))
  );
}

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
  localStorage.clear();
});

describe("MiniCalendar collapse behavior", () => {
  it("stays expanded when collapse is not enabled", async () => {
    localStorage.setItem("kalend:mini-calendar-collapsed", "true");
    await renderMiniCalendar();

    expect(document.querySelector('[aria-label="Collapse mini calendar"]')).toBeNull();
    expect(document.querySelector('[aria-label="Previous month"]')).not.toBeNull();
    expect(document.querySelectorAll("button").length).toBeGreaterThan(2);
  });

  it("initializes collapsed on mount when previously collapsed (no flash)", async () => {
    localStorage.setItem("kalend:mini-calendar-collapsed", "true");
    await renderMiniCalendar(true);

    expect(document.querySelector('[aria-label="Expand mini calendar"]')).not.toBeNull();
    expect(document.querySelectorAll("button").length).toBe(3);
  });

  it("persists an explicit collapsed preference", async () => {
    await renderMiniCalendar(true);

    const collapseButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Collapse mini calendar"]'
    );
    expect(collapseButton).not.toBeNull();

    await act(() => collapseButton?.click());

    expect(localStorage.getItem("kalend:mini-calendar-collapsed")).toBe("true");
    expect(document.querySelector('[aria-label="Expand mini calendar"]')).not.toBeNull();
    expect(document.querySelectorAll("button").length).toBe(3);

    await act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    await renderMiniCalendar(true);

    expect(document.querySelector('[aria-label="Expand mini calendar"]')).not.toBeNull();
    expect(document.querySelectorAll("button").length).toBe(3);
  });
});
